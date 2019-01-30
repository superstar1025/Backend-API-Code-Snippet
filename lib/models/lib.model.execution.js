'use strict'

const async = require('async');

const select = exports.select = function(conn, param, cb) {

    const sql = 
        'SELECT uuid, created \
        FROM contract_execution \
        WHERE ?'

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

}

const selectContractClauseContractExecution = exports.selectContractClauseContractExecution = function(conn, param, cb) {

    const sql = 
        'SELECT id, uuid, created \
        FROM contract_execution \
        WHERE ?'

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            return cb(err);
        }

        if (results.length < 1) {
            return cb(null, null);
        }

        var execution = {
            'execution': {
                'uuid': results[0].uuid,
                'created': results[0].created
            }
        }

        var sql = 
            'SELECT c.uuid, c.name, ccce.status, ccce.executed, cc.sequence, ccce.created \
            FROM contract_clause_contract_execution ccce \
            JOIN contract_clause cc ON ccce.contract_clause_id = cc.id \
            JOIN clause c ON cc.clause_id = c.id \
            WHERE ? \
            ORDER BY cc.sequence';

        var param = {'ccce.contract_execution_id': results[0].id}

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                return cb(err);
            }

            execution['execution']['clauses'] = results;

            // for each clause, get the integration uuids
            async.eachOf(execution['execution']['clauses'], function (value, key, cb) {

                const sql = 
                    'SELECT DISTINCT icc.uuid, i.name, i.description \
                    FROM integration_contract_clause icc \
                    JOIN integration i ON icc.integration_id = i.id \
                    JOIN contract_clause cc ON icc.contract_clause_id = cc.id \
                    JOIN contract_clause_contract_execution ccce ON cc.id = ccce.contract_clause_id \
                    JOIN clause c ON cc.clause_id = c.id \
                    WHERE ?'

                var param = {'c.uuid': value.uuid};

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        return cb(err);
                    }

                    execution['execution']['clauses'][key].integrations = results;

                    cb();
                });

            },
            function(err, result){
                cb(null, execution);
            });

        });

    });

}

const updateContractClauseContractExecution = exports.updateContractClauseContractExecution = function(conn, param, cb) {

    const sql = 
        'UPDATE contract_clause_contract_execution ccce \
        JOIN contract_execution ce ON ccce.contract_execution_id = ce.id \
        SET ? \
        WHERE ? AND ?';

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            return cb(err);
        }

        cb(null, results);

    });

}

const create = exports.create = function(conn, contractId, cb) {

    async.waterfall([
        // create the contract_execution record
        // TODO: make this a transaction
        function(cb) {
            const sql = 
                'INSERT INTO contract_execution \
                SET uuid = UUID(), created = CURRENT_TIMESTAMP(), ?'

            const param = {'contract_id': contractId};

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    return cb(err);
                }
                cb(null, results['insertId']);
            });
        },
        // create the contract_clause_contract_execution records
        function(contractExecutionId, cb) {
            const sql = 
                'INSERT INTO contract_clause_contract_execution (contract_clause_id, contract_execution_id, created) \
                SELECT id, ' + contractExecutionId + ', CURRENT_TIMESTAMP() \
                FROM contract_clause \
                WHERE ?';

            const param = {'contract_id': contractId};

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    return cb(err);
                }
                cb(null, contractExecutionId);
            });
        }
    ],
    function(err, contractExecutionId) {
        cb(null, contractExecutionId);
    });
}
'use strict'

const async = require('async');
const logger = require('../lib.logger');
const util = require('../lib.util');

const list = exports.list = function(conn, cb) {
    
    const sql = 
        'SELECT uuid, created \
        FROM contract'

    conn.query(sql, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

};

const select = exports.select = function(conn, param, cb) {

    const sql = 
        'SELECT * \
        FROM contract \
        WHERE ?';

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

};

const selectUser = exports.selectUser = function(conn, userId, param, cb) {

    if (param) {
         var sql = 
            'SELECT c.uuid, c.name, c.description, c.status, c.created \
            FROM account_contract ac \
            JOIN account_usr au ON ac.account_id = au.account_id \
            JOIN contract c ON ac.contract_id = c.id \
            WHERE ? AND ?';

        param = [{'au.usr_id': userId}, param];

    } else {

        var sql = 
            'SELECT c.uuid, c.name, c.description, c.status, c.created \
            FROM account_contract ac \
            JOIN account_usr au ON ac.account_id = au.account_id \
            JOIN contract c ON ac.contract_id = c.id \
            WHERE ?';

        param = {'au.usr_id': userId};
    }

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        if (results.length > 0) {
            cb(null, results);
        } else {
            cb(null, null);
        }
    });

}

const selectAccount = exports.selectAccount = function(conn, contractUuid, cb) {

    const sql = 
        'SELECT a.uuid \
        FROM account_contract ac \
        JOIN account a ON ac.account_id = a.id \
        JOIN contract c ON ac.contract_id = c.id \
        WHERE ?';

    const param = {'c.uuid': contractUuid};

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

}

const selectExecution = exports.selectExecution = function(conn, userId, param, limit, cb) {

    var limitSql = '';

    if (limit) {
        limitSql = 'LIMIT ' + limit;
    }

    if (param) {
        
        var sql = 
            'SELECT ce.uuid, ce.created \
            FROM contract_execution ce \
            JOIN contract c ON ce.contract_id = c.id \
            JOIN account_contract ac ON ce.contract_id = ac.contract_id \
            JOIN account_usr au ON ac.account_id = au.account_id \
            WHERE ? AND ? \
            ORDER BY created DESC ' + limitSql;

        var param = [param, {'au.usr_id': userId}];

    } else {

        var sql = 
            'SELECT ce.uuid, ce.created \
            FROM contract_execution ce \
            JOIN contract c ON ce.contract_id = c.id \
            JOIN account_contract ac ON ce.contract_id = ac.contract_id \
            JOIN account_usr au ON ac.account_id = au.account_id \
            WHERE ? \
            ORDER BY created DESC ' + limitSql;

        var param = {'au.usr_id': userId};

    }

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        if (results.length > 0) {
            cb(null, results);
        } else {
            cb(null, false);
        }
    });

}


const selectClause = exports.selectClause = function(conn, contractUuid, cb) {

    const sql = 
        'SELECT DISTINCT cc.uuid, cl.uuid as clause_uuid, cl.name, cl.description, cc.sequence \
        FROM contract_clause cc \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        WHERE ? \
        ORDER BY cc.sequence';

    const param = {'c.uuid': contractUuid};

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

}

const insertAccountContract = exports.insertAccountContract = function(conn, accountId, contract, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            cb(err);
        }

        async.waterfall([
            function(cb){
                // insert the contract
                const sql = 'INSERT INTO contract \
                    (uuid, name, description, status, created) \
                    VALUES \
                    ((SELECT UUID()),?,?,?,CURRENT_TIMESTAMP())';

                const param = [contract.name, contract.description, contract.status];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, results.insertId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.contract',
                        'insertAccountContract', 'Insert contract', {'err': err, 'sql': sql,
                        'param': param, 'fields': fields, 'results': results}]));
                });
            },
            function(contractId, cb){
                // insert the user-message reference
                const sql = 'INSERT INTO account_contract (account_id, contract_id, created) \
                    VALUES \
                    (?, ?, CURRENT_TIMESTAMP())';

                const param = [accountId, contractId];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, contractId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.contract',
                            'insertAccountContract', 'Insert account_contract', {'err': err, 'sql': sql,
                            'param': param, 'fields': fields, 'results': results}]));
                });
            }
        ], function(err, contractId){
            if (err) {
                cb(null, false);
                logger.debug(util.log(['s','lib/models/lib.model.contract',
                            'insertAccountContract', 'Rollback transaction']));
            } else {
                conn.commit(function(err) {
                    if (err) { 
                        conn.rollback(function() {
                            cb(err);
                            logger.debug(util.log(['s','lib/models/lib.model.contract',
                                'insertAccountContract', 'Rollback transaction']));
                        });
                    } else {
                        cb(null, contractId);
                        logger.debug(util.log(['s','lib/models/lib.model.contract',
                            'insertAccountContract', 'Commit transaction']));
                    }
                });
            }
        });
    });

}

const update = exports.update = function(conn, userId, param, contractDetails, cb) {

    const sql = 
        'UPDATE contract c \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        SET ? \
        WHERE ? AND ?'

    param = [contractDetails, param, {'au.usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            console.log(err)
            cb(err);
        } else {
            if (results.affectedRows > 0) {
                cb(null, true);
            } else {
                cb(null, false);
            }                   
            logger.debug(util.log(['s','lib/models/lib.model.contract', 'update',
                'Query contract', {'err': err, 'sql': sql, 'param': param,
                'fields': fields, 'results': results}]));    
        }
    });
}

const del = exports.del = function(conn, userId, contractUuid, cb) {

    const sql = 
        'DELETE c FROM contract c \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        WHERE ? AND ?';

    var param = [{'c.uuid': contractUuid},{'au.usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            cb(err);
        } else {
            if (results.affectedRows > 0) {
                cb(null, true);
            } else {
                cb(null, false);
            }            
        }
        logger.debug(util.log(['s','lib/models/lib.model.contract', 'delete',
            'Query delete', {'err': err, 'sql': sql, 'param': param,
            'fields': fields, 'results': results}]));
    });

}
'use strict'
const async = require('async');
const logger = require('../lib.logger');
const util = require('../lib.util');

const insertAccountIntegrationOption = exports.insertAccountIntegrationOption = function(conn, userId, integrationUuid, integrationDetails, cb) {

 var sql = 'INSERT INTO account_integration_option (integration_id, account_id, uuid, name, value, created) \
            SELECT i.id, a.id, UUID(), ?, ?, CURRENT_TIMESTAMP() \
            FROM integration i \
            JOIN account_integration ai ON i.id = ai.integration_id \
            JOIN account_usr au ON ai.account_id = au.account_id \
            JOIN account a ON au.account_id = a.id \
            WHERE au.usr_id = ? \
            AND i.uuid = ?';

            if('url' in integrationDetails) {
                integrationDetails.value = integrationDetails.url;
            }

            var param = [integrationDetails.name, integrationDetails.value, userId, integrationUuid];

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, results.insertId);
                }
                logger.debug(util.log(['s','lib/models/lib.model.integration',
                    'insertAccountIntegrationOption', 'Insert account integration option', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
            });

}

const selectAccountIntegrationOption = exports.selectAccountIntegrationOption = function(conn, userId, integrationOptionId, cb) {

        var sql = 'SELECT aio.uuid, aio.name, aio.value, i.uuid as integration_uuid, i.name as integration_name, \
            i.description as integration_description, aio.created \
            FROM account_integration_option aio \
            JOIN integration i ON aio.integration_id = i.id \
            JOIN account_integration ai ON i.id = ai.integration_id \
            JOIN account_usr au ON ai.account_id = au.account_id \
            JOIN account a ON au.account_id = a.id \
            WHERE au.usr_id = ? \
            AND aio.id = ?';

            var param = [userId, integrationOptionId];

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, results);
                }
                logger.debug(util.log(['s','lib/models/lib.model.integration',
                    'selectAccountIntegrationOption', 'Select account integration option', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
            });

}

const selectAccountIntegrationOptions = exports.selectAccountIntegrationOptions = function(conn, userId, integrationUuid, cb) {

    var sql = 'SELECT DISTINCT aio.uuid, aio.name, aio.value, aio.created \
        FROM account_integration_option aio \
        JOIN integration i ON aio.integration_id = i.id \
        JOIN account a ON aio.account_id = a.id \
        JOIN account_integration ai ON a.id = ai.account_id AND i.id = ai.integration_id \
        JOIN account_usr au ON a.id = au.account_id  \
        WHERE au.usr_id = ? \
        AND i.uuid = ?';

    var param = [userId, integrationUuid];

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            cb(null, results);
        }
        logger.debug(util.log(['s','lib/models/lib.model.integration',
            'selectAccountIntegrationOptions', 'Select account integration options', {'err': err, 'sql': sql,
            'param': param, 'fields': fields, 'results': results}]));
    });
}

const selectIntegrationOption = exports.selectIntegrationOption = function(conn, userId, integrationUuid, integrationOptionId, cb) {

    var sql = 'SELECT aio.uuid, aio.name, aio.value, i.uuid as integration_uuid, i.name as integration_name, \
        i.description as integration_description, aio.created \
        FROM account_integration_option aio \
        JOIN integration i ON aio.integration_id = i.id \
        JOIN account_integration ai ON i.id = ai.integration_id \
        JOIN account_usr au ON ai.account_id = au.account_id \
        JOIN account a ON au.account_id = a.id \
        WHERE au.usr_id = ? \
        AND i.uuid = ? \
        AND aio.uuid = ?';

    var param = [userId, integrationUuid, integrationOptionId];

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            cb(null, results);
        }
        logger.debug(util.log(['s','lib/models/lib.model.integration',
            'selectIntegrationOption', 'Select integration option', {'err': err, 'sql': sql,
            'param': param, 'fields': fields, 'results': results}]));
    });

}

const selectIntegrationOptionClauses = exports.selectIntegrationOptionClauses = function(conn, userId, integrationOptionId, cb) {
        
    var sql = 'SELECT DISTINCT c.uuid as contract_uuid, c.name as contract_name, c.description as contract_description, \
        cl.uuid as clause_uuid, cl.name as clause_name, cl.description as clause_description, cc.uuid as contract_clause_uuid \
        FROM account_integration_contract_clause aicc \
        JOIN account_integration ai ON aicc.account_integration_id = ai.id \
        JOIN account_integration_option aio ON (aicc.account_integration_option_id = aio.id AND ai.account_id = aio.account_id AND ai.integration_id = aio.integration_id) \
        JOIN contract_clause cc ON aicc.contract_clause_id = cc.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_usr au ON ai.account_id = au.account_id \
        WHERE au.usr_id = ? \
        AND aio.uuid = ?';

    var param = [userId, integrationOptionId];

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            cb(null, results);
        }
        logger.debug(util.log(['s','lib/models/lib.model.integration',
            'selectIntegrationOptionClauses', 'Select integration option clauses', {'err': err, 'sql': sql,
            'param': param, 'fields': fields, 'results': results}]));
    });

}

const selectIntegrationOptionExecution = exports.selectIntegrationOptionExecution = function(conn, userId, integrationOptionId, cb) {
        
    var sql = 'SELECT DISTINCT ce.uuid as contract_execution_uuid, c.uuid as contract_uuid, c.name as contract_name, \
        c.description as contract_description, cl.uuid as clause_uuid, cl.name as clause_name, cl.description as clause_description, \
        cc.uuid as contract_clause_uuid, ccce.executed, ccce.status, aiccce.meta \
        FROM account_integration_contract_clause_contract_execution aiccce \
        JOIN account_integration_contract_clause aicc ON aiccce.account_integration_contract_clause_id = aicc.id \
        JOIN account_integration ai ON aicc.account_integration_id = ai.id \
        JOIN account_integration_option aio ON (aicc.account_integration_option_id = aio.id AND ai.account_id = aio.account_id AND ai.integration_id = aio.integration_id) \
        JOIN contract_clause_contract_execution ccce ON aiccce.contract_clause_contract_execution_id = ccce.id \
        JOIN contract_execution ce ON ccce.contract_execution_id = ce.id \
        JOIN contract_clause cc ON ccce.contract_clause_id = cc.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_usr au ON ai.account_id = au.account_id \
        WHERE au.usr_id = ? \
        AND aio.uuid = ?';

    var param = [userId, integrationOptionId];

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            cb(null, results);
        }
        logger.debug(util.log(['s','lib/models/lib.model.integration',
            'selectIntegrationOptionExecution', 'Select integration option executions', {'err': err, 'sql': sql,
            'param': param, 'fields': fields, 'results': results}]));
    });

}

const selectContractClause = exports.selectContractClause = function(conn, integrationUuid, cb) {

    const sql = 
        'SELECT cc.id AS contract_clause_id, cc.contract_id \
        FROM integration_contract_clause icc \
        JOIN contract_clause cc ON icc.contract_clause_id = cc.id \
        WHERE ?';

    const param = {'icc.uuid': integrationUuid};

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

}

const updateAccountIntegrationOption = exports.updateAccountIntegrationOption = function(conn, userId, integrationOptionUuid, integrationOptionDetails, cb) {

    const sql = 
        'UPDATE account_integration_option aio \
        JOIN account_usr au ON aio.account_id = au.account_id \
        SET ? \
        WHERE ? AND ?'

    var param = [integrationOptionDetails, {'aio.uuid': integrationOptionUuid}, {'au.usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            cb(err);
        } else {
            if (results.affectedRows > 0) {
                cb(null, true);
            } else {
                cb(null, false);
            }                   
            logger.debug(util.log(['s','lib/models/lib.model.integration', 'update',
                'Query account_integration_option', {'err': err, 'sql': sql, 'param': param,
                'fields': fields, 'results': results}]));    
        }
    });
}

const deleteAccountIntegrationOption = exports.deleteAccountIntegrationOption = function(conn, userId, integrationOptionUuid, cb) {

    const sql = 
        'DELETE aio FROM account_integration_option aio \
        JOIN account_usr au ON aio.account_id = au.account_id \
        WHERE ? AND ?';

    var param = [{'aio.uuid': integrationOptionUuid},{'au.usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            cb(err);
        } else {
            if (results.affectedRows > 0) {
                cb(null, integrationOptionUuid);
            } else {
                cb(null, false);
            }            
        }
        logger.debug(util.log(['s','lib/models/lib.model.integration', 'delete',
            'Query delete', {'err': err, 'sql': sql, 'param': param,
            'fields': fields, 'results': results}]));
    });

}

// Library to manage the user model
// - Select user
// - Select resources
// - Insert user account
// - Select user password 
// - Manage authorized resources

'use strict'

const async = require('async');
const logger = require('../lib.logger');
const util = require('../lib.util');
const env = require('../lib.env');

const select = exports.select = function(conn, param, cb) {

     async.series([
        function(cb) {
            util.validateParam(param, function(err, param) {
                if (err) {
                    cb(err);
                } else if (!param) {
                    cb(true);
                    logger.warn(util.log(['s','lib/models/lib.model.user', 'select',
                    'Invalid param', {'err': err, 'param': param}]));
                } else {
                    cb(null, true);
                }
            }); 
        },
        function(cb){
            const sql = 
                'SELECT * \
                FROM usr u \
                WHERE ?';
                
            conn.query(sql, param, function(err, user, fields) {
                if (err) {
                    cb(err);
                    logger.error(util.log(['s','lib/models/lib.model.user', 'select',
                        'Query usr', {'err': err, 'sql': sql, 'param': param,
                        'fields': fields}]));
                } else if (user.length > 0) {
                    cb(null, user[0]); 
                    logger.debug(util.log(['s','lib/models/lib.model.user', 'select',
                        'Query usr', {'err': err, 'sql': sql, 'param': param,
                        'fields': fields, 'results': user[0]}]));           
                } else {
                    cb(true);
                    logger.debug(util.log(['s','lib/models/lib.model.user', 'select',
                    'Query usr', {'err': err, 'sql': sql, 'param': param,
                    'fields': fields}]));
                }

            });
        }
    ], function(err, user) {
        if (err) {
            cb(null, false);
        } else {
            cb(null, user[1]);
        }
    });

}

const selectAccount = exports.selectAccount = function(conn, param, cb) {

    async.waterfall([
        function(cb) {
            select(conn, param, function(err, user){
                if (!user) {
                    cb(true);
                } else {
                    delete(user.id);
                    cb(null, user);
                }
            });
        },
        function(user, cb){

             const sql = 
                'SELECT a.uuid, a.created\
                FROM account a \
                JOIN account_usr au ON a.id = au.account_id \
                JOIN usr u ON au.usr_id = u.id \
                WHERE ?';

            conn.query(sql, param, function(err, accounts, fields) {

                if (err) {
                    throw err
                    cb(err);
                } else {
                    user.accounts = accounts;
                    cb(null, user);
                    logger.debug(util.log(['s','lib/models/lib.model.user', 'selectAccount',
                        'Query account_usr', {'err': err, 'sql': sql, 'param': param,
                        'fields': fields, 'results': user}]));
                }   
            });    

        }

    ], function(err, userAccounts){
        if (err) {
            cb(null, false);
        } else {
            cb(null, userAccounts);
        }
    });
}

const update = exports.update = function(conn, param, userDetails, cb) {

    const sql = 
        'UPDATE usr \
        SET ? \
        WHERE ?';

    param = [userDetails, param];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            cb(err);
        } else {
            cb(null, results);            
        }
        logger.debug(util.log(['s','lib/models/lib.model.user', 'update',
            'Query usr', {'err': err, 'sql': sql, 'param': param,
            'fields': fields, 'results': results}]));
    });
}

const selectResources = exports.selectResources = function(conn, userUuid, cb) {

    async.parallel([
        // accounts
        function(cb) {
            const sql = 'SELECT GROUP_CONCAT(DISTINCT a.uuid) as account \
                      FROM account_usr au \
                      JOIN account a ON au.account_id = a.id \
                      JOIN usr u ON au.usr_id = u.id \
                      WHERE ?';

            const param = {'u.uuid': userUuid}
            
            conn.query(sql, param, function (err, results, fields) {

                if (err) {
                    cb(err);
                } else {
                    var account = results[0]['account'];
                    account = account.split(",");

                    cb(null, account);

                }

                logger.debug(util.log(['s','lib/models/lib.model.user',
                    'selectResources', 'Select account', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));

            });
        },
        // contracts
        function(cb) {
            const sql = 'SELECT GROUP_CONCAT(DISTINCT c.uuid) as contract \
                      FROM account_usr au \
                      JOIN account a ON au.account_id = a.id \
                      JOIN account_contract ac ON a.id = ac.account_id \
                      JOIN contract c ON ac.contract_id \
                      JOIN usr u ON au.usr_id = u.id \
                      WHERE ?'

            const param = {'u.uuid': userUuid}
            
            conn.query(sql, param, function (err, results, fields) {

                if (err) {
                    cb(err);
                } else {
                    var contract = results[0]['contract'];

                    if (contract) {
                        contract = contract.split(",");
                    } else {
                        contract = null;
                    }

                    cb(null, contract);

                }

                logger.debug(util.log(['s','lib/models/lib.model.user',
                    'selectResources', 'Select contract', {'err': err, 'sql': sql, 
                    'param': param, 'fields': fields, 'results': results}]));

            });
        },
        // integrations
        function(cb) {
            const sql = 'SELECT GROUP_CONCAT(DISTINCT icc.uuid) as integration_contract_clause \
                      FROM integration_contract_clause icc \
                      JOIN contract_clause cc ON icc.contract_clause_id = cc.id \
                      JOIN account_contract ac ON cc.contract_id = ac.contract_id \
                      JOIN account_usr au ON ac.account_id = au.account_id \
                      JOIN usr u ON au.usr_id = u.id \
                      WHERE ?'

            const param = {'u.uuid': userUuid}
            
            conn.query(sql, param, function (err, results, fields) {

                if (err) {
                    cb(err);
                } else {

                    var icc = results[0]['integration_contract_clause'];

                    if (icc) {
                        icc = icc.split(",");
                    } else {
                        icc = null;
                    }

                    cb(null, icc);

                }

                logger.debug(util.log(['s','lib/models/lib.model.user',
                    'selectResources', 'Select integration', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
               
            });
        },
        // executions
        function(cb) {
            var sql = 'SELECT GROUP_CONCAT(DISTINCT ce.uuid) as execution \
                      FROM account_usr au \
                      JOIN account a ON au.account_id = a.id \
                      JOIN account_contract ac ON a.id = ac.account_id \
                      JOIN contract_clause cc ON ac.contract_id = cc.contract_id \
                      JOIN contract_clause_contract_execution ccce ON cc.id = ccce.contract_clause_id \
                      JOIN contract_execution ce ON ccce.contract_execution_id = ce.id \
                      JOIN usr u ON au.usr_id = u.id \
                      WHERE ?'

            var param = {'u.uuid': userUuid}
            
            conn.query(sql, param, function (err, results, fields) {

                if (err) {
                    cb(err);
                } else {

                    var execution = results[0]['execution'];

                    if (execution) {
                        var execution = execution.split(",");
                    } else {
                        var execution = null;
                    }

                    cb(null, execution);
                }

                logger.debug(util.log(['s','lib/models/lib.model.user', 
                    'selectResources', 'Select execution', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
            });
        }

    ],
    function(err, results){
        if (err) {
            return cb(err);
        }

        const resources = {
            account: results[0],
            contract: results[1],
            integration_contract_clause: results[2],
            execution: results[3],
            list: results[0].concat(results[1], results[2], results[3])
        }

        cb(null, resources);

        logger.debug(util.log(['s','lib/models/lib.model.user', 'selectResources',
            'Result', {'resourecs': resources}]));
    });
}

const insertUserAccount = exports.insertUserAccount = function(conn, user, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            cb(err);
        }

        async.waterfall([
            function(cb){
                // insert the user
                const sql = 'INSERT INTO usr \
                    (uuid, auth_id, first_name, last_name, email, phone, marketing_pref, created) \
                    VALUES \
                    (?,?,?,?,?,?,?,CURRENT_TIMESTAMP())';

                const param = [user.uuid, user.auth_id, user.first_name, user.last_name, user.email, user.phone, user.marketing_pref];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, results.insertId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.user',
                        'insertUserAccount', 'Insert usr', {'err': err, 'sql': sql,
                        'param': param, 'fields': fields, 'results': results}]));
                });
            },
            function(userId, cb){
                // insert the account if not present
                if (!('account_id' in user)) {
                    const sql = 'INSERT INTO account (uuid, created) \
                        VALUES \
                        (UUID(), CURRENT_TIMESTAMP())';
                    
                    conn.query(sql, function (err, results, fields) {
                        if (err) {
                            conn.rollback(function(){
                                cb(err);
                            });
                        } else {
                            cb(null, userId, results.insertId);
                        }

                        logger.debug(util.log(['s','lib/models/lib.model.user',
                        'insertUserAccount', 'Insert account', {'err': err, 'sql': sql,
                        'param': '', 'fields': fields, 'results': results}]));
                    });

                } else {
                    const sql = 'SELECT id FROM account WHERE uuid = ?';
                    conn.query(sql, user.account_id, function (err, results, fields) {
                        if (err || results[0].length < 0) {
                            conn.rollback(function(){
                                cb(err);
                            });
                        } else {
                            cb(null, userId, results[0].id);
                        }

                        logger.debug(util.log(['s','lib/models/lib.model.user',
                            'insertUserAccount', 'Select account', {'err': err, 'sql': sql,
                            'param': param, 'fields': fields, 'results': results}]));
                    });
                }
            },
            function(userId, accountId, cb){
                // insert the user-account reference
                const sql = 'INSERT INTO account_usr (usr_id, account_id, created) \
                    VALUES \
                    (?, ?, CURRENT_TIMESTAMP())';

                const param = [userId, accountId];

                conn.query(sql, param, function (err, results, fields) {
                        if (err) {
                            conn.rollback(function(){
                                cb(err);
                            });
                        } else {
                            cb(null, userId, accountId);
                        }

                        logger.debug(util.log(['s','lib/models/lib.model.user',
                            'insertUserAccount', 'Insert account_usr', {'err': err, 'sql': sql,
                            'param': param, 'fields': fields, 'results': results}]));
                });
            },
            function(userId, accountId, cb){
                // insert the user-integrations reference
                const sql = 'INSERT INTO account_integration (uuid, integration_id, account_id, created) \
                    SELECT UUID(), id, ?, CURRENT_TIMESTAMP() FROM integration';

                conn.query(sql, accountId, function (err, results, fields) {
                        if (err) {
                            conn.rollback(function(){
                                cb(err);
                            });
                        } else {
                            cb(null, userId);
                        }

                        logger.debug(util.log(['s','lib/models/lib.model.user',
                            'insertUserAccount', 'Insert account_integration', {'err': err, 'sql': sql,
                            'param': accountId, 'fields': fields, 'results': results}]));
                });
            }
        ], function(err, userId){
            if (err) {
                return cb(err);
            }
            conn.commit(function(err) {
                if (err) { 
                    conn.rollback(function() {
                        cb(err);
                        logger.debug(util.log(['s','lib/models/lib.model.user',
                            'insertUserAccount', 'Rollback transaction']));
                    });
                } else {
                    cb(null, userId);
                    logger.debug(util.log(['s','lib/models/lib.model.user',
                        'insertUserAccount', 'Commit transaction']));
                }
            });
        });
    });

};

const del = exports.del = function(conn, param, cb) {

    const sql = 
        'DELETE FROM usr \
        WHERE ?';

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
        logger.debug(util.log(['s','lib/models/lib.model.user', 'delete',
            'Query usr', {'err': err, 'sql': sql, 'param': param,
            'fields': fields, 'results': results}]));
    });
}

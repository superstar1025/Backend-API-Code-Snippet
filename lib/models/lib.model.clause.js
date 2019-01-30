'use strict'
const async = require('async');
const logger = require('../lib.logger');
const util = require('../lib.util');

const select = exports.select = function(conn, param, cb) {

    const sql = 
        'SELECT uuid, name, description, created \
        FROM clause \
        WHERE ?'

        conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

}

const selectContractClauses = exports.selectContractClauses = function(conn, param, cb) {

    const sql = 
        'SELECT cl.uuid, cl.name, cl.description, 1 as enabled, cl.created \
        FROM clause cl';

    // param for future election of enabled/disabled
    conn.query(sql, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

}

const selectClauseAddress = function(conn, param, cb) {

    const sql = 
        'SELECT cl.uuid, cl.name, cl.description, 1 as enabled, cl.created \
        FROM clause cl';

    //const param = {'c.uuid': clauseUuid};
    // param for future election of enabled/disabled
    conn.query(sql, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

}


const insertContractClause = exports.insertContractClause = function(conn, userId, contractUuid, clauseUuid, cb) {

    // NEEDS TO BE A TRANSACTION

    async.waterfall([
        function(cb){
            var sql = 'SELECT c.id from contract c \
                JOIN account_contract ac ON c.id = ac.contract_id \
                JOIN account_usr au ON ac.account_id = au.account_id \
                WHERE ? \
                AND ?';

            var param = [{'au.usr_id':userId},{'c.uuid':contractUuid}];

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    return cb(err);
                } else {
                    if(!results) {
                        cb('invalid contract');
                    } else {
                        cb(null, results[0].id);
                    }
                }
            });
        },
        function(contract_id, cb){
            var sql = 'SELECT id from clause WHERE ?';

            var param = {'uuid':clauseUuid};

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    return cb(err);
                } else {
                    if(results.length < 1) {
                        cb('invalid clause');
                    } else {
                        cb(null, contract_id, results[0].id);
                    }
                }
            });
        },
        function(contract_id, clause_id, cb){
            var sql = 'INSERT INTO contract_clause \
                (uuid, contract_id, clause_id, sequence, created) \
                VALUES \
                (UUID(),?,?,1,CURRENT_TIMESTAMP())';

            var param = [contract_id, clause_id];

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, results.insertId);
                }
                logger.debug(util.log(['s','lib/models/lib.model.clause',
                    'insertContractClause', 'Insert contract clause', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
            });
        },
        // insert the inputs
        function(contract_clause_id, cb) {
            var sql = 'INSERT INTO contract_clause_clause_input (contract_clause_id, clause_input_id, created) \
                SELECT cc.id, ci.id, CURRENT_TIMESTAMP() FROM contract_clause cc \
                JOIN contract c ON cc.contract_id = c.id \
                JOIN clause cl ON cc.clause_id = cl.id \
                JOIN clause_input ci ON cl.id = ci.clause_id \
                JOIN account_contract ac ON c.id = ac.contract_id \
                JOIN account_usr au ON ac.account_id = au.account_id \
                WHERE au.usr_id = ? \
                AND c.uuid = ? \
                AND cc.id = ?';

            var param = [userId, contractUuid, contract_clause_id];

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, contract_clause_id);
                }
                logger.debug(util.log(['s','lib/models/lib.model.clause',
                    'insertContractClause', 'Insert contract clause inputs', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
            });
        },
        // insert the outputs
        function(contract_clause_id, cb) {
            var sql = 'INSERT INTO contract_clause_clause_output (contract_clause_id, clause_output_id, created) \
                SELECT cc.id, co.id, CURRENT_TIMESTAMP() FROM contract_clause cc \
                JOIN contract c ON cc.contract_id = c.id \
                JOIN clause cl ON cc.clause_id = cl.id \
                JOIN clause_output co ON cl.id = co.clause_id \
                JOIN account_contract ac ON c.id = ac.contract_id \
                JOIN account_usr au ON ac.account_id = au.account_id \
                WHERE au.usr_id = ? \
                AND c.uuid = ? \
                AND cc.id = ?';

            var param = [userId, contractUuid, contract_clause_id];

            conn.query(sql, param, function (err, results, fields) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, contract_clause_id);
                }
                logger.debug(util.log(['s','lib/models/lib.model.clause',
                    'insertContractClause', 'Insert contract clause outputs', {'err': err, 'sql': sql,
                    'param': param, 'fields': fields, 'results': results}]));
            });
        }
    ], function(err, results){
        if(err){
            if(err.code === 'ER_DUP_ENTRY') {
                cb('clause already exists for contract')
            } else {
                cb(err);
            }
        } else {
            var param = [userId, {'c.uuid':contractUuid}, {'cc.id':results}];
            selectContractClause(conn, userId, param, function(err, results){
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            })
        }
    });
}

const updateContractClause = exports.updateContractClause = function(conn, userId, contractUuid, clauseUuid, address,
    inputs, inputIntegration, outputs, outputIntegration, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            cb(err);
        }

        async.waterfall([
            function(cb){
                // update the address
                if(address){
                    var sql = 'DELETE ccaca FROM contract_clause_account_chain_address ccaca \
                        JOIN contract_clause cc ON ccaca.contract_clause_id = cc.id \
                        JOIN contract c ON cc.contract_id = c.id \
                        JOIN account_contract ac ON c.id = ac.contract_id \
                        JOIN account_chain_address aca ON ac.account_id = aca.account_id \
                        JOIN chain_address ca ON aca.chain_address_id = ca.id \
                        JOIN account_usr au ON ac.account_id = au.account_id \
                        WHERE c.uuid = ? \
                        AND ca.uuid = ? \
                        AND cc.uuid = ? \
                        AND au.usr_id = ?';

                    var param = [contractUuid, address, clauseUuid, userId];

                    conn.query(sql, param, function (err, results, fields) {
                        if (err) {
                            conn.rollback(function(){
                                cb(err);
                            });
                        } else {
                            var sql = 'INSERT INTO contract_clause_account_chain_address \
                                (contract_clause_id, account_chain_address_id, created) \
                                SELECT DISTINCT cc.id, aca.id, CURRENT_TIMESTAMP() \
                                FROM contract c \
                                JOIN contract_clause cc ON c.id = cc.contract_id \
                                JOIN clause cl ON cc.clause_id = cl.id \
                                JOIN account_contract ac ON c.id = ac.contract_id \
                                JOIN account_chain_address aca ON ac.account_id = aca.account_id \
                                JOIN chain_address ca ON aca.chain_address_id = ca.id \
                                JOIN account_usr au ON ac.account_id = au.account_id \
                                WHERE cc.uuid = ? \
                                AND c.uuid = ? \
                                AND ca.uuid = ? \
                                AND au.usr_id = ?';
                        }

                        var param = [clauseUuid, contractUuid, address, userId];

                        conn.query(sql, param, function (err, results, fields) {

                            if (err) {
                                conn.rollback(function(){
                                    cb(err);
                                });
                            } else {
                                cb(null, userId)
                            }
                            logger.debug(util.log(['s','lib/models/lib.model.clause',
                                'updateContractClause', 'Delete address', {'err': err, 'sql': sql,
                                'param': param, 'fields': fields, 'results': results}]));
                        });
                    });
                } else {
                    cb(null, userId);
                }
            },
            // update the inputs (defaults)
            function(userId, cb){
                // for each input, update the default
                if(inputs) {
                    async.each(inputs, function(input, cb) {

                        if (input.default === '') {
                            input.default = null;
                        }

                        var sql = 'UPDATE contract_clause_clause_input ccci \
                            JOIN contract_clause cc ON ccci.contract_clause_id = cc.id \
                            JOIN contract c ON cc.contract_id = c.id \
                            JOIN clause cl ON cc.clause_id = cl.id \
                            JOIN clause_input ci ON (cl.id = ci.clause_id AND ccci.clause_input_id = ci.id) \
                            JOIN input i ON ci.input_id = i.id \
                            JOIN account_contract ac ON c.id = ac.contract_id \
                            JOIN account_usr au ON ac.account_id = au.account_id \
                            SET ccci.default = ? \
                            WHERE au.usr_id = ? \
                            AND c.uuid = ? \
                            AND cc.uuid = ? \
                            AND i.uuid = ?';

                        var param = [input.default, userId, contractUuid, clauseUuid, input.uuid];

                        conn.query(sql, param, function (err, results, fields) {

                                if (err) {
                                    conn.rollback(function(){
                                        cb(err);
                                    });
                                } else {
                                    cb();
                                }
                                logger.debug(util.log(['s','lib/models/lib.model.clause',
                                    'updateContractClause', 'Update input default', {'err': err, 'sql': sql,
                                    'param': param, 'fields': fields, 'results': results}]));
                            });

                    }, function(err){
                        if(err) {
                            cb(err);
                        } else {
                            cb(null, userId);
                        }
                    });
                } else {
                    cb(null, userId);
                }

            },
            // update the input integrations
            function(userId, cb){
                async.each(inputIntegration, function(integration, cb) {
                     async.waterfall([
                        function(cb){
                            if(integration.option_uuid){
                                var sql = 'SELECT i.name, aio.id, aio.value \
                                    FROM account_integration_option aio \
                                    JOIN integration i ON aio.integration_id = i.id \
                                    WHERE aio.uuid = ?';

                                conn.query(sql, integration.option_uuid, function (err, results, fields) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        integration.name = results[0].name;
                                        integration.option_value = results[0].value;
                                        cb(null, results[0].id);
                                    }
                                });
                            } else {
                                var sql = 'SELECT name \
                                    FROM integration \
                                    WHERE uuid = ?';

                                conn.query(sql, integration.integration_uuid, function (err, results, fields) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        integration.name = results[0].name;
                                        cb(null, null);
                                    }
                                });
                            }
                        },
                        // assign the correct meta
                        function(integrationOptionId, cb){
                            integration.meta = null;
                            switch(integration.name) {
                                case 'Web form':
                                    integration.meta = integration.option_value;
                                    break;
                                case 'API':
                                    integration.meta = 'https://api.blocktetris.com/...';
                                    break;
                                case 'Web hook':
                                    integration.meta = integration.option_value;
                                    break;
                                case 'Previous':
                                    integration.meta = 'This will be replaced by previous clause name';
                                    break;
                                 case 'Next':
                                    integration.meta = 'This will be replaced by next clause name';
                                    break;
                            }
                            cb(null, integrationOptionId);
                        },
                        function(integrationOptionId, cb){
                            // if there is a uuid, then update
                            if('uuid' in integration && integration.uuid != null) {
                                var sql = 'UPDATE account_integration_contract_clause aicc \
                                    JOIN account_integration ai ON aicc.account_integration_id = ai.id \
                                    JOIN integration i ON ai.integration_id = i.id \
                                    JOIN account_contract ac ON ai.account_id = ac.account_id \
                                    JOIN contract_clause cc ON ac.contract_id = cc.contract_id \
                                    JOIN contract c ON cc.contract_id = c.id \
                                    JOIN account_usr au ON ac.account_id = au.account_id \
                                    SET aicc.meta = ?, aicc.account_integration_option_id = ? \
                                    WHERE aicc.uuid = ? \
                                    AND au.usr_id = ?';

                                var inputIntegrationParam = [integration.meta, integrationOptionId, integration.uuid, userId];

                            // otherwise, insert
                            } else {

                                var sql = 'INSERT INTO account_integration_contract_clause \
                                    (uuid, account_integration_id, contract_clause_id, account_integration_option_id, meta, created) \
                                    SELECT UUID(), ai.id, cc.id, ?, ?, CURRENT_TIMESTAMP() \
                                    FROM account_integration ai \
                                    JOIN integration i ON ai.integration_id = i.id \
                                    JOIN account_contract ac ON ai.account_id = ac.account_id \
                                    JOIN contract_clause cc ON ac.contract_id = cc.contract_id \
                                    JOIN contract c ON cc.contract_id = c.id \
                                    JOIN account_usr au ON ac.account_id = au.account_id \
                                    WHERE i.uuid = ? \
                                    AND c.uuid = ? \
                                    AND cc.uuid = ? \
                                    AND au.usr_id = ?';

                                var inputIntegrationParam = [integrationOptionId, integration.meta, integration.integration_uuid, contractUuid, clauseUuid, userId];

                            }

                            conn.query(sql, inputIntegrationParam, function (err, results, fields) {

                                    if (err) {
                                        conn.rollback(function(){
                                            cb(err);
                                        });
                                    } else {
                                        if(results.affectedRows > 0 || results.insertId > 0) {
                                            cb();
                                        } else {
                                            cb('invalid integration input');
                                        }
                                    }
                                    logger.debug(util.log(['s','lib/models/lib.model.clause',
                                        'updateContractClause', 'Update input integrations', {'err': err, 'sql': sql,
                                        'param': inputIntegrationParam, 'fields': fields, 'results': results}]));
                                });
                        }
                    ], function(err, results){
                        if(err){
                            cb(err);
                        } else {
                            cb();
                        }
                    });
                }, function(err){
                    if(err) {
                        cb(err);
                    } else {
                        cb(null, userId);
                    }
                });

            },
            // update the outputs (defaults)
            function(userId, cb){
                if(outputs) {
                    // for each output, update the default
                    async.each(outputs, function(output, cb) {
                        var sql = 'UPDATE contract_clause_clause_output ccco \
                            JOIN contract_clause cc ON ccco.contract_clause_id = cc.id \
                            JOIN contract c ON cc.contract_id = c.id \
                            JOIN clause cl ON cc.clause_id = cl.id \
                            JOIN clause_output co ON (cl.id = co.clause_id AND ccco.clause_output_id = co.id) \
                            JOIN output o ON co.output_id = o.id \
                            JOIN account_contract ac ON c.id = ac.contract_id \
                            JOIN account_usr au ON ac.account_id = au.account_id \
                            SET ccco.default = ? \
                            WHERE au.usr_id = ? \
                            AND c.uuid = ? \
                            AND cc.uuid = ? \
                            AND o.uuid = ?';

                        var param = [output.default, userId, contractUuid, clauseUuid, output.uuid];

                        conn.query(sql, param, function (err, results, fields) {

                                if (err) {
                                    conn.rollback(function(){
                                        cb(err);
                                    });
                                } else {
                                    cb();
                                }
                                logger.debug(util.log(['s','lib/models/lib.model.clause',
                                    'updateContractClause', 'Update output default', {'err': err, 'sql': sql,
                                    'param': param, 'fields': fields, 'results': results}]));
                            });

                    }, function(err){
                        if(err) {
                            cb(err);
                        } else {
                            cb(null, userId);
                        }
                    });
                } else {
                    cb(null, userId);
                }
            },
            // update the output integrations
            function(userId, cb){
                async.each(outputIntegration, function(integration, cb) {
                    integration.meta = 'meta';
                    async.waterfall([
                        function(cb){
                            if(integration.option_uuid){
                                var sql = 'SELECT i.name, aio.id, aio.value \
                                    FROM account_integration_option aio \
                                    JOIN integration i ON aio.integration_id = i.id \
                                    WHERE aio.uuid = ?';

                                conn.query(sql, integration.option_uuid, function (err, results, fields) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        integration.name = results[0].name;
                                        integration.option_value = results[0].value;
                                        cb(null, results[0].id);
                                    }
                                });
                            } else {
                                var sql = 'SELECT name \
                                    FROM integration \
                                    WHERE uuid = ?';

                                conn.query(sql, integration.integration_uuid, function (err, results, fields) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        integration.name = results[0].name;
                                        cb(null, null);
                                    }
                                });
                            }
                        },
                        // assign the correct meta
                        function(integrationOptionId, cb){
                            integration.meta = null;
                            switch(integration.name) {
                                case 'Web form':
                                    integration.meta = integration.option_value;
                                    break;
                                case 'API':
                                    integration.meta = 'https://api.blocktetris.com/...';
                                    break;
                                case 'Web hook':
                                    integration.meta = integration.option_value;
                                    break;
                                case 'Previous':
                                    integration.meta = 'This will be replaced by previous clause name';
                                    break;
                                 case 'Next':
                                    integration.meta = 'This will be replaced by next clause name';
                                    break;
                            }
                            cb(null, integrationOptionId);
                        },
                        function(integrationOptionId, cb){
                            // if there is a uuid, then update
                            if('uuid' in integration && integration.uuid != null) {
                                var sql = 'UPDATE account_integration_contract_clause aicc \
                                    JOIN account_integration ai ON aicc.account_integration_id = ai.id \
                                    JOIN integration i ON ai.integration_id = i.id \
                                    JOIN account_contract ac ON ai.account_id = ac.account_id \
                                    JOIN contract_clause cc ON ac.contract_id = cc.contract_id \
                                    JOIN contract c ON cc.contract_id = c.id \
                                    JOIN account_usr au ON ac.account_id = au.account_id \
                                    SET aicc.meta = ?, aicc.account_integration_option_id = ? \
                                    WHERE aicc.uuid = ? \
                                    AND au.usr_id = ?';

                                var outputIntegrationParam = [integration.meta, integrationOptionId, integration.uuid, userId];

                            // otherwise, insert
                            } else {


                                var sql = 'INSERT INTO account_integration_contract_clause \
                                    (uuid, account_integration_id, contract_clause_id, account_integration_option_id, meta, created) \
                                    SELECT UUID(), ai.id, cc.id, ?, ?, CURRENT_TIMESTAMP() \
                                    FROM account_integration ai \
                                    JOIN integration i ON ai.integration_id = i.id \
                                    JOIN account_contract ac ON ai.account_id = ac.account_id \
                                    JOIN contract_clause cc ON ac.contract_id = cc.contract_id \
                                    JOIN contract c ON cc.contract_id = c.id \
                                    JOIN account_usr au ON ac.account_id = au.account_id \
                                    WHERE i.uuid = ? \
                                    AND c.uuid = ? \
                                    AND cc.uuid = ? \
                                    AND au.usr_id = ?';

                                var outputIntegrationParam = [integrationOptionId, integration.meta, integration.integration_uuid, contractUuid, clauseUuid, userId];

                            }

                            conn.query(sql, outputIntegrationParam, function (err, results, fields) {

                                    if (err) {
                                        conn.rollback(function(){
                                            cb(err);
                                        });
                                    } else {
                                        if(results.affectedRows > 0 || results.insertId > 0) {
                                            cb();
                                        } else {
                                            cb('invalid integration output');
                                        }
                                    }
                                    logger.debug(util.log(['s','lib/models/lib.model.clause',
                                        'updateContractClause', 'Update output integrations', {'err': err, 'sql': sql,
                                        'param': outputIntegrationParam, 'fields': fields, 'results': results}]));
                                });
                        }
                    ], function(err, results){
                        if(err){
                            cb(err);
                        } else {
                            cb();
                        }
                    });
                }, function(err){
                    if(err) {
                        cb(err);
                    } else {
                        cb(null, userId);
                    }
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
                        logger.debug(util.log(['s','lib/models/lib.model.clause',
                            'updateContractClause', 'Rollback transaction']));
                    });
                } else {
                    cb(null, userId);
                    logger.debug(util.log(['s','lib/models/lib.model.clause',
                        'updateContractClause', 'Commit transaction']));
                }
            });
        });
    });

};

const selectContractClause = exports.selectContractClause = function(conn, userId, param, cb) {

    const sql = 
        'SELECT cc.uuid, cl.uuid as clause_uuid, cl.name, cl.description, cc.sequence, 1 as enabled, cc.created \
        FROM clause cl \
        JOIN contract_clause cc ON cl.id = cc.clause_id \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        WHERE ? \
        AND ? \
        AND ?';

        console.log(sql)
        console.log(param)

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            return cb(err);
        } else {
            if(results.length > 0){
                cb(null, results[0]);
            } else {
                cb('invalid clause')
            }
        }
    });
}

const selectContractClauseIntegration = exports.selectContractClauseIntegration = function(conn, param, cb) {

    const sql = 'SELECT uuid, name, description, LOWER(REPLACE(name, \' \', \'\')) as type, direction, created \
        FROM integration \
        WHERE direction IN (?)';

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                cb(err);
            } else {
                cb(null, results);
            }
        });

}

const selectContractClauseAccountIntegration = exports.selectContractClauseAccountIntegration = function(conn, param, cb) {

    const sql = 'SELECT aicc.uuid, i.uuid as integration_uuid, i.name, i.description, aicc.meta, aio.uuid as option_uuid, aio.name as option_name, aicc.created \
        FROM account_integration_contract_clause aicc \
        LEFT JOIN account_integration_option aio ON aicc.account_integration_option_id = aio.id \
        JOIN account_integration ai ON aicc.account_integration_id = ai.id \
        JOIN integration i ON ai.integration_id = i.id \
        JOIN contract_clause cc ON aicc.contract_clause_id = cc.id \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_usr au ON ai.account_id = au.account_id \
        WHERE  ? \
        AND ? \
        AND ? \
        AND ? \
        ORDER by aicc.created ASC';

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                cb(err);
            } else {
                cb(null, results);
            }
        });

}

const selectIntegration = exports.selectIntegration = function(conn, clauseUuid, cb) {

    const sql = 
        'SELECT icc.uuid, i.name, i.description \
        FROM integration_contract_clause icc \
        JOIN integration i ON icc.integration_id = i.id \
        JOIN contract_clause cc ON icc.contract_clause_id = cc.id \
        JOIN clause c ON cc.clause_id = c.id \
        WHERE ? \
        ORDER BY cc.sequence';

    const param = {'c.uuid': clauseUuid};

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

}

const selectClauseInput = exports.selectClauseInput = function(conn, clauseUuid, cb) {

    // don't expose the regex to the caller
    const sql = 
        'SELECT i.uuid, i.name, i.description, i.datatype \
        FROM clause_input ci \
        JOIN input i ON ci.input_id = i.id \
        JOIN clause c ON ci.clause_id = c.id \
        WHERE ?';

    const param = {'c.uuid': clauseUuid};

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

}

const selectInput = exports.selectInput = function(conn, inputUuid, cb) {

    const sql = 
        'SELECT uuid, name, description, datatype, regex, created \
        FROM input \
        WHERE uuid = ?';

        conn.query(sql, inputUuid, function (err, results, fields) {
            if (err) {
                return cb(err);
            }
            cb(null, results[0]);
        });

}

const selectContractClauseInput = exports.selectContractClauseInput = function(conn, param, cb) {

    const sql = 
        'SELECT DISTINCT i.uuid, i.name, i.description, i.datatype, i.regex, ccci.default, i.created \
        FROM input i \
        JOIN clause_input ci ON i.id = ci.input_id \
        JOIN clause cl ON ci.clause_id = cl.id \
        JOIN contract_clause cc ON cl.id = cc.clause_id \
        JOIN contract_clause_clause_input ccci ON (ci.id = ccci.clause_input_id AND cc.id = ccci.contract_clause_id) \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        WHERE ? \
        AND ? \
        AND ?';

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                return cb(err);
            }
            cb(null, results);
        });

}

const selectOutput = exports.selectOutput = function(conn, outputUuid, cb) {

    const sql = 
        'SELECT uuid, name, description, datatype, regex, created \
        FROM output \
        WHERE uuid = ?';

        conn.query(sql, outputUuid, function (err, results, fields) {
            if (err) {
                return cb(err);
            }
            cb(null, results[0]);
        });

}

const selectContractClauseOutput = exports.selectContractClauseOutput = function(conn, param, cb) {

    const sql = 
        'SELECT DISTINCT o.uuid, o.name, o.description, o.datatype, o.regex, ccco.default, o.created \
        FROM output o \
        JOIN clause_output co ON o.id = co.output_id \
        JOIN clause cl ON co.clause_id = cl.id \
        JOIN contract_clause cc ON cl.id = cc.clause_id \
        JOIN contract_clause_clause_output ccco ON (co.id = ccco.clause_output_id AND cc.id = ccco.contract_clause_id) \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        WHERE ? \
        AND ? \
        AND ?';

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                return cb(err);
            }
            cb(null, results);
        });

}

const selectContractClauseAccountChainAddress = exports.selectContractClauseAccountChainAddress = function(conn, param, cb) {

    const sql = 'SELECT DISTINCT ca.uuid, ca.name, ca.address, ca.created, ch.uuid as chain_uuid, ch.name as chain_name \
        FROM chain_address ca \
        JOIN chain ch ON ca.chain_id = ch.id \
        JOIN account_chain_address aca ON ca.id = aca.chain_address_id \
        JOIN contract_clause_account_chain_address ccaca ON aca.id = ccaca.account_chain_address_id \
        JOIN contract_clause cc ON ccaca.contract_clause_id = cc.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        WHERE au.usr_id = ? \
        AND ? \
        AND ?';

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                return cb(err);
            }
            if(results.length > 1) {
                cb('invalid results');
            } else {
                cb(null, results[0]);
            }
        });

}

const selectContractClauseChainAddresses = exports.selectContractClauseChainAddresses = function(conn, param, cb) {

    const sql = 'SELECT DISTINCT ca.uuid, ca.name, ca.address, ca.created, ch.uuid as chain_uuid, ch.name as chain_name \
        FROM chain_address ca \
        JOIN chain ch ON ca.chain_id = ch.id \
        JOIN account_chain_address aca ON ca.id = aca.chain_address_id \
        JOIN account_usr au ON aca.account_id = au.account_id \
        WHERE au.usr_id = ?';

        conn.query(sql, param, function (err, results, fields) {
            if (err) {
                cb(err);
            } else {
                cb(null, results);
            }
        });

}

const selectContractClauseChainAddress = exports.selectContractClauseChainAddress = function(conn, param, cb) {

    const sql = 
        'SELECT ca.address, c.uuid as chain_uuid, c.name, ccca.gas, ccca.gas_limit \
        FROM contract_clause_chain_address ccca \
        JOIN chain_address ca ON ccca.chain_address_id = ca.id \
        JOIN chain c ON ca.chain_id = c.id \
        JOIN contract_clause cc ON ccca.contract_clause_id = cc.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        WHERE ?';

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

}

const deleteContractClause = exports.deleteContractClause = function(conn, userId, contractUuid, contractClauseUuid, cb) {

    const sql = 
        'DELETE cc FROM contract_clause cc \
        JOIN contract c ON cc.contract_id = c.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        JOIN account_contract ac ON c.id = ac.contract_id \
        JOIN account_usr au ON ac.account_id = au.account_id \
        WHERE ? \
        AND ? \
        AND ?';

    var param = [{'c.uuid': contractUuid},{'cc.uuid': contractClauseUuid},{'au.usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            cb(err);
        } else {
            if (results.affectedRows > 0) {
                cb(null, contractClauseUuid);
            } else {
                cb(null, false);
            }            
        }
        logger.debug(util.log(['s','lib/models/lib.model.contract', 'delete',
            'Query contract_clause', {'err': err, 'sql': sql, 'param': param,
            'fields': fields, 'results': results}]));
    });

}

const deleteContractClauseIntegration = exports.deleteContractClauseIntegration = function(conn, userId, contractUuid, contractClauseUuid, integrationUuid, cb) {

    const sql = 
        'DELETE aicc FROM account_integration_contract_clause aicc \
        JOIN account_integration ai ON aicc.account_integration_id = ai.id \
        JOIN account_usr au ON ai.account_id = au.account_id \
        JOIN contract_clause cc ON aicc.contract_clause_id = cc.id \
        JOIN contract c ON cc.contract_id = c.id \
        WHERE ? \
        AND ? \
        AND ? \
        AND ?';

    var param = [{'c.uuid': contractUuid},{'cc.uuid': contractClauseUuid},{'aicc.uuid': integrationUuid},{'au.usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {

        if (err) {
            cb(err);
        } else {
            if (results.affectedRows > 0) {
                cb(null, contractClauseUuid);
            } else {
                cb(null, false);
            }            
        }
        logger.debug(util.log(['s','lib/models/lib.model.contract', 'delete',
            'Delete account_integration_contact_clause', {'err': err, 'sql': sql, 'param': param,
            'fields': fields, 'results': results}]));
    });

}
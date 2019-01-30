'use strict';

const async = require('async');

const env = require('../../lib/lib.env');
const auth = require('../../lib/lib.auth');
const integration = require('../../lib/lib.integration');
const clause = require('../../lib/lib.clause');
const account = require('../../lib/lib.account');
const user = require('../../lib/lib.user');
const execution = require('../../lib/lib.execution');
const validate = require('../../lib/lib.validate');

const logger = require('../../lib/lib.logger');

exports.getAccountIntegrationOptions = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.integration', 'getAccountIntegrationOptions',
                    'SubId validation error', {'error': err}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // get the user id
        function(subId, cb) {
            user.getUser({'u.auth_id': subId}, function(err, userDetails){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails.id);
                }
            });
        },
        // get clauses
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if (!('integrationClauseUuid' in req.params)) {
                cb('missing required params');
            } else {
                integration.getAccountIntegrationOptions(userId, req.params.integrationClauseUuid, function(err, integrationOptions){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, integrationOptions);
                    }
                });
            }
        }
    ], function(err, integrationOptions) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').json(integrationOptions);
        }
    });

}

exports.getAccountIntegrationOption = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.integration', 'getAccountIntegrationOptions',
                    'SubId validation error', {'error': err}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // get the user id
        function(subId, cb) {
            user.getUser({'u.auth_id': subId}, function(err, userDetails){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails.id);
                }
            });
        },
        // get clauses
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if (!('integrationUuid' in req.params) || !('integrationOptionUuid' in req.params)) {
                cb('missing required params');
            } else {
                integration.getAccountIntegrationOption(userId, req.params.integrationUuid,
                    req.params.integrationOptionUuid, function(err, integrationOption){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, integrationOption);
                    }
                });
            }
        }
    ], function(err, integrationOption) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if(integrationOption){
                res.status('200').json(integrationOption);
            } else {
                res.status('404').json({'error':'integration option not found'});
            }
        }
    });

}

exports.setAccountIntegrationOption = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.integration', 'setAccountIntegrationOption',
                    'SubId validation error', {'error': err}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // get the user id
        function(subId, cb) {
            user.getUser({'u.auth_id': subId}, function(err, userDetails){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails.id);
                }
            });
        },
        // get clauses
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if (!('integrationUuid' in req.params) || !('integrationOptionUuid' in req.params)) {
                cb('missing required params');
            } else {
                integration.updateAccountIntegrationOption(userId, req.params.integrationUuid, req.params.integrationOptionUuid,
                    req.body, function(err, results){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, results);
                    }
                });
            }
        }
    ], function(err, integrationOption) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if(integrationOption){
                res.status('200').json(integrationOption);
            } else {
                res.status('404').json({'error':'integration option not found'});
            }
        }
    });

}

const createAccountIntegration = exports.createAccountIntegration = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.integration', 'createAccountIntegration',
                    'SubId validation error', {'error': err}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // get the user id
        function(subId, cb) {
            user.getUser({'u.auth_id': subId}, function(err, userDetails){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails.id);
                }
            });
        },
        // get clauses
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if (!('integrationUuid' in req.params)) {
                cb('missing required params');
            } else {
                integration.createAccountIntegration(userId, req.params.integrationUuid, req.body, function(err, clauses){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, clauses);
                    }
                });
            }
        }
    ], function(err, accountIntegrationOption) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').json({'success': 'account integration created', 'integration': accountIntegrationOption});
        }
    });

}

exports.deleteAccountIntegrationOption = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.integration', 'deleteAccountIntegrationOption',
                    'SubId validation error', {'error': err}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // get the user id
        function(subId, cb) {
            user.getUser({'u.auth_id': subId}, function(err, userDetails){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails.id);
                }
            });
        },
        // get clauses
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if (!('integrationUuid' in req.params) || !('integrationOptionUuid' in req.params)) {
                cb('missing required params');
            } else {
                integration.deleteAccountIntegrationOption(userId, req.params.integrationOptionUuid,
                    function(err, integrationOptionUuid){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, integrationOptionUuid);
                    }
                });
            }
        }
    ], function(err, integrationOptionUuid) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if(integrationOptionUuid){
                res.status('200').json({'success': 'integration option deleted', 'uuid': integrationOptionUuid});
            } else {
                res.status('404').json({'error':'integration option not found'});
            }
        }
    });

}

const execute = exports.execute = function(req, res) {

    async.waterfall([
        // confirm the jwt is provided and valid
        function(cb) {
            auth.validateRequest(req, function(err, resources){
                if (err) {
                    return cb(err);
                }
                cb(null, resources);
            });
        },
        // confirm the integration_contract_clause is valid
        function(resources, cb) {
            auth.validateResource(req, 'integrationUuid', resources, function(err, value) {
                if (err) {
                    return cb(err);
                }
                cb(null, value);
            });
        },
        function(integrationUuid, cb) {
            // confirm it's an integration uuid in proper state
            integration.getContractClause(integrationUuid, function(err, contractClause) {
                if (err) {
                    return cb({status: '404', 'message': err});
                } 
                cb(null, contractClause['contract_clause_id'], integrationUuid);
            })
        },
        // TODO: validate the execution ID, and cascade value
        // check and validate the post body
        function(contractClauseId, integrationUuid, cb) {
            // get the inputs for the clause
            const param = {'cc.id': contractClauseId};
            var inputs = {};
            clause.getContractClauseInput(param, function(err, contractClauseInputs) {
                if (err) {
                    return cb({status: '422', 'message': 'Invalid inputs'});
                }

                // if no required inputs, continue
                if (!contractClauseInputs) {
                    return cb(null);
                }

                // confirm the body contains an inputs key
                if (!('inputs' in req.body)) {
                    return cb({status: '422', 'message': 'Inputs required'});
                }
                // validate each input
                async.eachOf(contractClauseInputs, function(input, key, cb) {
                    if (!(input.name in req.body.inputs)){
                        return cb({status: '422', 'message': 'Required input missing: [' + input.name + ']'});
                    }
                    var patt = new RegExp(input.regex);
                    if(!patt.test(req.body.inputs[input.name])) {
                        return cb({status: '422', 'message': 'Invalid input value: ' + input.name});
                    }
                    inputs[input.name] = req.body.inputs[input.name];
                    cb();
                }, function(err){
                    cb(null, contractClauseId, integrationUuid, inputs);
                });
            })
        },
        // if it's not set, create a new execution
        function(contractClauseId, integrationUuid, inputs, cb) { 
            if('execution' in req.body && 'uuid' in req.body['execution'] && req.body['execution']['uuid'] != null) {
                // regex here
                execution.getContractClauseContractExecution(req.body.execution.uuid, function(err, executionDetails) {
                    if (err) {
                        return cb({status: '422', 'message': err})
                    }

                    if (!execution) {
                        return cb({status: '422', 'message': 'Invalid execution UUID'})
                    }
                    cb(null, inputs, executionDetails, contractClauseId);
                });
            } else {
                // get the contract_clause id
                integration.getContractClause(integrationUuid, function(err, results) {
                    // get the associated contract id
                    execution.createExecution(results['contract_id'], results['contract_clause_id'], function(err, contractExecutionId) {
                        // get the uuid
                        execution.getContractClauseContractExecution({id: contractExecutionId}, function(err, executionDetails) {
                            if (err) {
                                return cb({status: '422', 'message': err})
                            }
                            cb(null, inputs, executionDetails, results['contract_clause_id']);
                        })

                    })

                })
            }
        },
        // check the status of the associated contract_clause_contract_execution is pending
        function(inputs, executionDetails, contractClauseId, cb){
            clause.getClause(contractClauseId, function(err, clause){
                if (err) {
                    cb({status: '422', 'message': err});
                } else {
                    cb(null, inputs, executionDetails, contractClauseId, clause['uuid']);
                }
            });
        },
        // validate the Clause status
        function(inputs, executionDetails, contractClauseId, clauseUuid, cb) {
            integration.validateClauseStatus(executionDetails, clauseUuid, function(err, res) {
                if (err) {
                    cb({status: '422', 'message': err});
                } else {
                    cb(null, inputs, executionDetails, contractClauseId, clauseUuid);
                }
            });
        },
        // set the specific contract clause to executing
        function(inputs, executionDetails, contractClauseId, clauseUuid, cb) {
            const param = [{'ccce.status': 'executing'}, {'ccce.contract_clause_id': contractClauseId}, {'ce.uuid': executionDetails.execution.uuid}];
            execution.setContractClauseContractExecution(param, function(err, results){
                if (err) {
                    return cb({status: '422', 'message': err})
                }
                cb(null, inputs, executionDetails, clauseUuid);
            });
        }, 
        // build the attributes
        function(inputs, executionDetails, clauseUuid, cb) {
            var attributes = {
                'execution_uuid': { 
                    DataType: "String",
                    StringValue: executionDetails.execution.uuid
                },
                'clause_uuid': {
                    DataType: "String",
                    StringValue: clauseUuid
                },
                'integration_uuid': {
                    DataType: "String",
                    StringValue: req.params.integrationUuid, 
                }
            };

            cb(null, executionDetails, attributes, inputs, clauseUuid);
            
        },
        // get the account address 
        function(executionDetails, attributes, inputs, clauseUuid, cb) {
            const param = {'cl.uuid': clauseUuid};
            account.getAccountChainAddress(param, function(err, accountChainAddress) {
                var address = {
                    address: accountChainAddress.address,
                    chain_name: accountChainAddress.name,
                    chain_uuid: accountChainAddress.chain_uuid
                };
                cb(null, executionDetails, attributes, inputs, address, clauseUuid);
            });
        },
        // get the contract clause address
        function(executionDetails, attributes, inputs, address, clauseUuid, cb) {
            const param = {'cl.uuid': clauseUuid};
            clause.getContractClauseChainAddress(param, function(err, contractClauseChainAddress) {
                var contract = {
                    address: contractClauseChainAddress.address,
                    chain_name: contractClauseChainAddress.name,
                    chain_uuid: contractClauseChainAddress.chain_uuid,
                    gas: contractClauseChainAddress.gas,
                    gas_limit: contractClauseChainAddress.gas_limit
                };
                cb(null, executionDetails, attributes, inputs, address, contract);
            });

        },
        // get the gas
        function(executionDetails, attributes, inputs, address, contract, cb) {
            cb(null, executionDetails, attributes, inputs, address, contract);
        },
        // consolidate inputs, contract details and send/receive addresses
        function(executionDetails, attributes, inputs, address, contract, cb) {

            var message = {
                contract: contract,
                address: address,
                inputs: inputs
            }

            cb(null, executionDetails, attributes, message);
        }
    ],
    function(err, executionDetails, attributes, message) {

        if (err) {
            return res.status(err.status).send({'error': err.message});
        }

        res.send(executionDetails);

        integration.sendMessage(attributes, message, function(err, messageId){
            if(err) {
                logger.error('Could not send message with attributes %j and message %j', attributes, message);
                return (err);
            }
            logger.debug('Message with attributes %j and message %j sent to queue with id %s.', attributes, message, messageId);
            return;
        });

    });

};

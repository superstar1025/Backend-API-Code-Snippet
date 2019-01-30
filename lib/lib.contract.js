'use strict'

const async = require('async');
const logger = require('./lib.logger');
const util = require('./lib.util');
const validate = require('./lib.validate');
const contractModel = require('./models/lib.model.contract');
const clauseModel = require('./models/lib.model.clause');
const conn = require('./lib.db');

const validateContract = exports.validateContract = function(contract, cb) {
    var data =[
        [contract, 'name', /^[a-zA-Z0-9-.'\s]{3,255}$/],
        [contract, 'description', /^[a-zA-Z0-9-.'\s]{3,255}$/],
        [contract, 'status', /^active|disabled$/]
    ];

    validate.validateObject(data,function(err,result){
        if (err) {
            cb(err);
        } else {
            if(result === true) {
                cb(null, contract);
            } else {
                cb(true, false);
            }
        }
    });
}


const getContractUser = exports.getContractUser = function(userId, param, cb) {

    async.waterfall([
        function(cb) {
            contractModel.selectUser(conn, userId, param, function(err, results) {
                if (err) {
                    cb('unable to get user');    
                    logger.error(util.log(['s', 'lib/lib.contract', 'getContractUser',
                        'Get user contracts failed', {'param': param, 'error': err}]));
                } else {
                    if (!results) {
                        cb(err, false);
                        logger.warn(util.log(['s', 'lib/lib.contract', 'getContractUser',
                            'Contracts not found', {'param': param}]));
                    } else {
                        cb(null, results);
                    }
                }
            });
        },
        function(results, cb){
            var i = 0;
            async.each(results, function(contractDetails, cb) {
                contractModel.selectExecution(conn, userId, {'c.uuid': contractDetails.uuid}, 1, function(err, lastExecuted){
                    if (lastExecuted) {
                        results[i].last_executed = lastExecuted[0].created;
                        results[i].execution_uuid = lastExecuted[0].uuid;
                    } else {
                        results[i].last_executed = null;
                        results[i].execution_uuid = null;
                    }
                    i = i + 1;
                    cb();
                });
            }, function(err){
                if (err) {
                    cb(err);
                    logger.error(util.log(['s', 'lib/lib.contract', 'getContractUser',
                        'Error', {'error': err}]));
                } else {
                    cb(null, results);
                    logger.verbose(util.log(['s', 'lib/lib.contract', 'getContractUser',
                        'Executions returned', {'param': param}]));
                }
            });
        },
        function(results, cb){
            var i = 0;
            async.each(results, function(contractDetails, cb) {
                contractModel.selectClause(conn, contractDetails.uuid, function(err, clauses){
                    if (clauses) {
                        results[i].clause = clauses;
                    } else {
                        results[i].clause = null;
                    }
                    i = i + 1;
                    cb();
                });
            }, function(err){
                if (err) {
                    cb(err);
                    logger.error(util.log(['s', 'lib/lib.contract', 'getContractUser',
                        'Error', {'error': err}]));
                } else {
                    cb(null, results);
                    logger.verbose(util.log(['s', 'lib/lib.contract', 'getContractUser',
                        'Clauses returned', {'param': param}]));
                }
            });
        }
    ], function(err, results){
        if(err){
            cb(err);
        } else {
            cb(null, results);
        }
    });
}

const getContract = exports.getContract = function(contractUuid, cb) {

    async.parallel([
        function(cb) {
            contractModel.select(conn, {'uuid':contractUuid}, function(err, results) {
                cb(err, results);
            });
        },
        function(cb) {
            contractModel.selectAccount(conn, contractUuid, function(err, results) {
                cb(err, results);
            });
        },
        function(cb) {
            contractModel.selectClause(conn, contractUuid, function(err, results) {

                var clauses = results;

                async.eachOf(results, function(value, key, cb) {
                    clauseModel.selectIntegration(conn, value.uuid, function(err, results) {
                        clauses[key].integrations = results;
                        clauseModel.selectClauseInput(conn, value.uuid, function(err, results) {
                            clauses[key].inputs = results;
                            cb();
                        });
                    });
                }, function(err){
                    cb(err, clauses);
                });
            });
        }
    ],
    function(err, results) {
        
        buildContract(results,function(err, contract) {
            if (err) {
                return cb(err);
            }
            cb(null, contract);
        });

    });

};

const createAccountContract = exports.createAccountContract = function(accountId, contract, cb) {

  async.series([
        function(cb) {
            validateContract(contract, function(err, valid) {
                if(err){
                    cb(err);
                } else {
                    if(!valid){
                        cb('Invalid contract');
                        logger.warn(util.log(['s', 'lib/lib.contract', 'createAccountContract',
                        'Contract failed validation', {'contract': contract}]));
                    } else {
                        cb();
                    }
                }
            });
        },
        function(cb) {
            contractModel.insertAccountContract(conn, accountId, contract, function(err, results) {
                if (err) {
                    cb(err);    
                    logger.error(util.log(['s', 'lib/lib.contract', 'createAccountContract',
                        'Create contract failed', {'param': param, 'error': err}]));
                } else {
                    cb(null, results);
                    logger.verbose(util.log(['s', 'lib/lib.contract', 'createAccountContract',
                        'Contract created', {'accountId': accountId, 'contractId': results}]));
                }
            });
        }
    ], function(err, results) {
        if (err) {
            cb(err, false);
        } else {
            contractModel.select(conn, {'id':results[1]}, function(err, contractDetails) {
                delete contractDetails.id;
                delete contractDetails.updated;
                cb(err, contractDetails);
            });
        }
    });

}

const updateContract = exports.updateContract = function(userId, contractUuid, contractUpdate, cb) {
    
    // userId, param, contractDetails
    async.waterfall([
        // validate the contract
        function(cb){
            util.validateJson(contractUpdate, function(contractUpdate){
                if (contractUpdate) {
                    cb(null, contractUpdate);
                    logger.verbose(util.log(['s', 'lib/lib.contract', 'updateAccountContract',
                        'Contract update validated', {'contract': contractUpdate}]));
                } else {
                    cb('Contract update failed validation');
                    logger.warn(util.log(['s', 'lib/lib.contract', 'updateAccountContract',
                        'User update failed validation', {'contract': contractUpdate}]));
                }
            })
        },
        // get the contract
        function(contractUpdate, cb){
            var param = {'c.uuid': contractUuid};
            getContractUser(userId, param, function(err, contractDetails){
                if (err) {
                    cb(err);
                } else { 
                    if (!contractDetails) {
                        cb('invalid contract');
                    } else {
                        cb(null, contractUpdate, contractDetails);
                    }
                }
            })
        },
        // confirm each input field is valid and update
        function(contractUpdate, contractDetails, cb){
            contractDetails = contractDetails[0];
            // strip out clauses, as they are updated by clause library
            delete(contractDetails.clause);
            delete(contractUpdate.clause);
            async.forEach(Object.keys(contractUpdate), function(field, cb) {
                if(contractDetails.hasOwnProperty(field)){
                    contractDetails[field] = contractUpdate[field];
                    cb();
                } else {
                    cb('invalid input field [' + field + ']');
                    logger.warn(util.log(['s', 'lib/lib.user', 'updateContract',
                        'Invalid field in contract update', {'contractUpdate': contractUpdate}]));
                }
            }, function(err){
                if(err){
                    cb(err);
                } else {
                    // delete the clause, created, updated, execution_uuid and last_executed elements
                    delete(contractDetails.created);
                    delete(contractDetails.updated);
                    delete(contractDetails.last_executed);
                    delete(contractDetails.execution_uuid);
                    cb(null, contractDetails);
                }
            });
        },
        // validate the user object
        function(contractDetails, cb){
            validateContract(contractDetails, function(err, results) {
                if(err){
                    cb(err);
                } else {
                    cb(null, contractDetails);
                }
            });
        },
        function(contractDetails, cb) {
            var param = {'c.uuid': contractUuid};
            contractModel.update(conn, userId, param, contractDetails, function(err, results) {
                if (err) {
                    cb('unable to update contract');
                    logger.error(util.log(['s', 'lib/lib.contract', 'updateContract',
                        'Update user failed', {'param': param}]));
                } else {
                    cb(null, param);
                    logger.verbose(util.log(['s', 'lib/lib.contract', 'updateContract',
                        'Update contract succeeded', {'param': param}]));
                }
            });
        }
    ], function(err, results) {
        if (err) {
            cb(err, false);
        } else {
            var param = {'c.uuid': contractUuid};
            getContractUser(userId, param, function(err, contractUser){
                if(err){
                    cb(err);
                } else {
                    cb(null, contractUser[0]);
                }
            });
        }
    });
}

const buildContract = function(results, cb) {

    const contract = {
        'contract': {
            uuid: results[0].uuid,
            created: results[0].created,
            account: {
                uuid: results[1].uuid
            },
            clauses: results[2]
        }
    };

    cb(null, contract);
}

const deleteContract = exports.deleteContract = function(userId, contractUuid, cb) {

    contractModel.del(conn, userId, contractUuid, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.contract', 'deleteContract',
                'Delete contract failed', {'param': param, 'error': err}]));
        } else {
            cb(null, results);
            logger.verbose(util.log(['s', 'lib/lib.contract', 'deleteContract',
                'Contract deleted', {'contractId': contractUuid, 'contractId': results}]));
        }
    });

}

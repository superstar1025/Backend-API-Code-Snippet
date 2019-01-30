'use strict'

const async = require('async');
const logger = require('./lib.logger');
const util = require('./lib.util');
const validate = require('./lib.validate');

const clauseModel = require('./models/lib.model.clause');
const conn = require('./lib.db');

const validateClauseAddress = exports.validateClauseAddress = function(clauseDetails, cb) {
    var data =[
        [clauseDetails.address, 'uuid', /^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/, true]
    ];

    validate.validateObject(data, function(err,result) {
        if (err) {
            cb(err, false);
        } else {
            if(result === true) {
                cb(null, clauseDetails.address.uuid);
            } else {
                cb(true, false);
            }
        }
    });
}

const validateClauseInputOutput = exports.validateClauseInputOutput = function(inputOutput, regex, cb) {

    var data =[
        [inputOutput, 'default', regex]
    ];

    validate.validateObject(data, function(err,result) {
        if (err) {
            cb(err, false);
        } else {
            if(result === true) {
                cb(null, inputOutput);
            } else {
                cb(true, false);
            }
        }
    });
}

const createContractClause = exports.createContractClause = function(userId, contractUuid, clauseUuid, cb) {

    // validate inputs

    clauseModel.insertContractClause(conn, userId, contractUuid, clauseUuid, function(err, contractClause) {
        if(err){
            cb(err);
        } else {
            cb(null, contractClause);
        }
    });
}

const updateContractClause = exports.updateContractClause = function(userId, contractUuid, contractClauseUuid, clauseDetails, cb) {

    // validate inputs

    async.waterfall([
        // validate the params
        function(cb) {
            cb(null);
        },
        // validate the address
        function(cb) {
            if('address' in clauseDetails){
                validateClauseAddress(clauseDetails, function(err, address) {
                    if(address === false) {
                        cb('invalid address');
                    } else {
                        cb(null,address);
                    }
                });
            } else {
                cb(null,null);
            }
        },
        // validate the inputs
        function(address, cb) {
            // check for inputs
            if('input' in clauseDetails) {
                if('inputs' in clauseDetails.input) {
                    async.each(clauseDetails.input.inputs, function(input, cb) {
                        if('uuid' in input) {
                            clauseModel.selectInput(conn, input.uuid, function(err, results){
                                if(results){
                                    validateClauseInputOutput(input, eval('/' + results.regex + '/'), function(err, results){
                                        if(results === false) {
                                            cb('invalid input value');
                                        } else {
                                            cb();
                                        }
                                    });
                                } else {
                                    cb('invalid input');
                                }
                            })
                        } else {
                            cb('invalid input');
                        }
                    }, function(err, results) {
                        if(err){
                            cb(err);
                        } else {
                            var inputs = clauseDetails.input.inputs;
                            cb(null, address, inputs);
                        }
                    });
                } else {
                     cb(null, address, null);
                }
            } else {
                cb(null, address, null);
            }
        },
        // validate the input integrations
        function(address, inputs, cb) {
            // check for inputs
            if('input' in clauseDetails) {
                if('integration' in clauseDetails.input) {
                    async.each(clauseDetails.input.integration, function(integration, cb) {
                        if('integration_uuid' in integration) {
                            /*clauseModel.selectInput(conn, input.uuid, function(err, results){
                                if(results){
                                    validateClauseInputOutput(input, eval('/' + results.regex + '/'), function(err, results){
                                        if(results === false) {
                                            cb('invalid input value');
                                        } else {
                                            cb();
                                        }
                                    });
                                } else {
                                    cb('invalid input');
                                }
                            })*/
                            cb();
                        } else {
                            cb('invalid input');
                        }
                    }, function(err, results) {
                        if(err){
                            cb(err);
                        } else {
                            var inputIntegration = clauseDetails.input.integration;
                            cb(null, address, inputs, inputIntegration);
                        }
                    });
                } else {
                     cb(null, address, inputs, null);
                }
            } else {
                cb(null, address, inputs, null);
            }
        },
        // validate the outputs
        function(address, inputs, inputIntegration, cb) {
            // check for outputs
            if('output' in clauseDetails) {
                if('outputs' in clauseDetails.output) {
                    async.each(clauseDetails.output.outputs, function(output, cb) {
                        if('uuid' in output) {
                            clauseModel.selectOutput(conn, output.uuid, function(err, results){
                                if(results) {
                                    validateClauseInputOutput(output, eval('/' + results.regex + '/'), function(err, results){
                                        if(results === false) {
                                            cb('invalid output value');
                                        } else {
                                            cb();
                                        }
                                    });
                                } else {
                                    cb('invalid output')
                                }
                            })
                        } else {
                            cb('invalid output');
                        }
                    }, function(err, results) {
                        if(err){
                            cb(err);
                        } else {
                            var outputs = clauseDetails.output.outputs;
                            cb(null, address, inputs, inputIntegration, outputs);
                        }
                    });
                } else {
                     cb(null, address, inputs, inputIntegration, null);
                }
            } else {
                cb(null, address, inputs, inputIntegration, null);
            }
        },
        // validate the output integrations
        function(address, inputs, inputIntegration, outputs, cb) {
            // check for inputs
            if('output' in clauseDetails) {
                if('integration' in clauseDetails.output) {
                    async.each(clauseDetails.output.integration, function(integration, cb) {
                        if('integration_uuid' in integration) {
                            /*clauseModel.selectInput(conn, input.uuid, function(err, results){
                                if(results){
                                    validateClauseInputOutput(input, eval('/' + results.regex + '/'), function(err, results){
                                        if(results === false) {
                                            cb('invalid input value');
                                        } else {
                                            cb();
                                        }
                                    });
                                } else {
                                    cb('invalid input');
                                }
                            })*/
                            cb();
                        } else {
                            cb('invalid output');
                        }
                    }, function(err, results) {
                        if(err){
                            cb(err);
                        } else {
                            var outputIntegration = clauseDetails.output.integration;
                            cb(null, address, inputs, inputIntegration, outputs, outputIntegration);
                        }
                    });
                } else {
                     cb(null, address, inputs, inputIntegration, outputs, null);
                }
            } else {
                cb(null, address, inputs, inputIntegration, outputs, null);
            }
        },
        // update the contract
        function(address, inputs, inputIntegration, outputs, outputIntegration, cb){
            clauseModel.updateContractClause(conn, userId, contractUuid, contractClauseUuid, address,
                inputs, inputIntegration, outputs, outputIntegration, function(err, results) {
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            });
        }
    ], function(err, results){
        if(err){
            cb(err);
        } else {
            getContractClause(userId, contractUuid, contractClauseUuid, function(err, contractClause){
                cb(null, contractClause);
            });
        }
    });
}

const getContractClauses = exports.getContractClauses = function(userId, contractUuid, cb){
    // validate userId and param
    var param = {'c.uuid': contractUuid};
    clauseModel.selectContractClauses(conn, param, function(err, clauseContract) {
        if(err){
            cb(err);
        } else {
            cb (null, clauseContract);
        }
    });

}

const getContractClauseChainAddresses = exports.getContractClauseChainAddresses = function(userId, contractUuid, clauseUuid, cb) {
    var param = userId;
    clauseModel.selectContractClauseChainAddresses(conn, param, function(err, contractClauseChainAddresses) {
        if (err) {
            return cb(err);
        }

        return cb(null, contractClauseChainAddresses);
    });

};


const getContractClauseIntegration = exports.getContractClauseIntegration = function(userId, contractUuid, clauseUuid, direction, cb) {
    var param = [direction.split(",")];
    clauseModel.selectContractClauseIntegration(conn, param, function(err, contractClauseIntegrations) {
        if (err) {
            return cb(err);
        }
        return cb(null, contractClauseIntegrations);
    });

};

const getContractClause = exports.getContractClause = function(userId, contractUuid, contractClauseUuid, cb){
    // validate userId and param
    var param = [{'au.usr_id':  userId},{'c.uuid': contractUuid},{'cc.uuid': contractClauseUuid}];
    async.waterfall([
        function(cb){
            clauseModel.selectContractClause(conn, userId, param, function(err, clauseDetails) {
                if(err){
                    cb(err);
                } else {
                    cb(null, clauseDetails);
                }
            });
        },
        function(clauseDetails,cb){
            clauseModel.selectContractClauseAccountChainAddress(conn, param, function(err, results){
                if(!results) {
                    results = {};
                } 
                clauseDetails.address = results;
                cb(null, clauseDetails);
            });
        },
        function(clauseDetails,cb){
            clauseModel.selectContractClauseInput(conn, param, function(err, results){
                if(!results) {
                    results = [];
                } 
                clauseDetails.input = 
                    { 
                        inputs: results,
                        integration: []
                    }
                cb(null, clauseDetails);
            });
        },
        function(clauseDetails,cb){
            clauseModel.selectContractClauseOutput(conn, param, function(err, results){
                if(!results) {
                    results = [];
                } 
                clauseDetails.output = 
                    { 
                        outputs: results,
                        integration: []
                    }
                cb(null, clauseDetails);
            });
        },
        function(clauseDetails, cb){
            param.push({'i.direction': 'in'});
            clauseModel.selectContractClauseAccountIntegration(conn, param, function(err, results){
                if(!results) {
                    results = [];
                } 
                clauseDetails.input.integration = results;
                // assign the appropriate url based on the type
                var i = 0;
                async.each(results, function(int, cb){
                    switch(int.name) {
                        case 'API':
                            clauseDetails.input.integration[i].url = '/integration/' + int.uuid;    
                            break;
                        case 'Web form':
                            clauseDetails.input.integration[i].url = '/integration/' + int.uuid;    
                            break;
                        case 'Web hook':
                            clauseDetails.input.integration[i].url = '/integration/' + int.uuid;    
                            break;
                        case 'Previous':
                            clauseDetails.input.integration[i].url = '/clause/' + int.uuid;    
                            break;
                        case 'Next':
                            clauseDetails.input.integration[i].url = '/clause/' + int.uuid;    
                            break;
                    }
                    i = i + 1;
                    cb();
                })
                param[3] = {'i.direction': 'out'};
                clauseModel.selectContractClauseAccountIntegration(conn, param, function(err, results){
                    if(!results) {
                        results = [];
                    } 
                    clauseDetails.output.integration = results;
                    var i = 0;
                    async.each(results, function(int, cb){
                        switch(int.name) {
                            case 'API':
                                clauseDetails.output.integration[i].url = '/integration/' + int.uuid;    
                                break;
                            case 'Web form':
                                clauseDetails.output.integration[i].url = '/integration/' + int.uuid;    
                                break;
                            case 'Web hook':
                                clauseDetails.output.integration[i].url = '/integration/' + int.uuid;    
                                break;
                            case 'Previous':
                                clauseDetails.output.integration[i].url = '/clause/' + int.uuid;    
                                break;
                            case 'Next':
                                clauseDetails.output.integration[i].url = '/clause/' + int.uuid;    
                                break;
                        }
                        i = i + 1;
                        cb();
                    })
                    cb(null, clauseDetails);
                });
            });
        }
    ], function(err, clauseDetails) {
        if(err){
            cb(err);
        } else {
            cb(null, clauseDetails);
        }
    });

}

const getClause = exports.getClause = function(contractClauseId, cb) {
    clauseModel.select(conn, {'id':contractClauseId}, function(err, clause) {
        if (err) {
            return cb(err);
        }
        cb(null, clause);
    }); 
}

const getContractClauseInput = exports.getContractClauseInput = function(param, cb) {
    clauseModel.selectContractClauseInput(conn, param, function(err, contractClauseInputs) {
        if (err) {
            return cb(err);
        }

        return cb(null, contractClauseInputs);
    });
};

const getContractClauseChainAddress = exports.getContractClauseChainAddress = function(param, cb) {
    clauseModel.selectContractClauseChainAddress(conn, param, function(err, contractClauseChainAddress) {
        if (err) {
            return cb(err);
        }

        return cb(null, contractClauseChainAddress);
    });

};

const deleteContractClause = exports.deleteContractClause = function(userId, contractUuid, contractClauseUuid, cb) {

    clauseModel.deleteContractClause(conn, userId, contractUuid, contractClauseUuid, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.contract', 'deleteContractClause',
                'Delete contract clause failed', {'error': err}]));
        } else {
            cb(null, results);
            logger.verbose(util.log(['s', 'lib/lib.contract', 'deleteContractClause',
                'Contract clause deleted', {'contractCLauseUuid': contractClauseUuid, 'contractClauseId': results}]));
        }
    });

}

const deleteContractClauseIntegration = exports.deleteContractClauseIntegration = function(userId, contractUuid, contractClauseUuid, integrationUuid, cb) {

    clauseModel.deleteContractClauseIntegration(conn, userId, contractUuid, contractClauseUuid, integrationUuid, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.contract', 'deleteContractClauseIntegration',
                'Delete contract clause failed', {'error': err}]));
        } else {
            cb(null, integrationUuid);
            logger.verbose(util.log(['s', 'lib/lib.contract', 'deleteContractClauseIntegration',
                'Contract clause integration deleted', {'contractClauseUuid': contractClauseUuid, 'contractClauseIntegrationUuid': integrationUuid}]));
        }
    });

}

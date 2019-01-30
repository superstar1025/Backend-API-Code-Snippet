'use strict'

const async = require('async');
const env = require('./lib.env');
const logger = require('./lib.logger');
const util = require('./lib.util');
const validate = require('./lib.validate');
const chart = require('./lib.chart');

const aws = require('aws-sdk');
aws.config.update(env.aws.creds);
const sqs = new aws.SQS({apiVersion: '2012-11-05'});

const contractModel = require('./models/lib.model.contract');
const executionModel = require('./models/lib.model.execution');
const clauseModel = require('./models/lib.model.clause');
const integrationModel = require('./models/lib.model.integration');
const conn = require('./lib.db');

const validateIntegrationOption = function(integrationOptionDetails, cb) {
    var data =[
        [integrationOptionDetails, 'name', /^[a-zA-Z0-9-.'\s]{3,255}$/],
        [integrationOptionDetails, 'value', /^[a-zA-Z0-9-./:'\s]{3,255}$/, true]
    ];

    validate.validateObject(data, function(err,result) {
        if (err) {
            cb(err, false);
        } else {
            if(result === true) {
                cb(null, integrationOptionDetails);
            } else {
                cb(true, false);
            }
        }
    });
}

const createAccountIntegration = exports.createAccountIntegration = function(userId, integrationUuid, integrationDetails, cb) {

    // validate inputs
    if(!('value' in integrationDetails)) {
        integrationDetails.value = null;
    }

    integrationModel.insertAccountIntegrationOption(conn, userId, integrationUuid, integrationDetails, function(err, accountIntegrationOptionId) {
        if(err){
            cb(err);
        } else {
            integrationModel.selectAccountIntegrationOption(conn, userId, accountIntegrationOptionId, function(err, results){
                cb(null, results);
            });
        }
    });
}

const validateClauseStatus = exports.validateClauseStatus = function(execution, contractClauseUuid, cb) {
    var seq = 1;
    var current = false;
    var future = false;
    async.eachOf(execution.execution.clauses, function(clause, key, cb) {
        // check the first clause is sequence 1
        var index = seq - 1;
        if (clause['sequence'] != seq) {
            return cb('Invalid clause sequence');
        }

        // if this is the current clause set curent and future
        if (clause['uuid'] === contractClauseUuid) {
            current = true;
            future = true;
        }

        // from the current clause on, state must be pending
        if((current || future) && clause['status'] != 'pending') {
            return cb('Invalid clause state');
        }

        // update the status to processing if current
        if(current) {
            execution.execution.clauses[index].status = 'executing';
            current = false;
        }

        seq++;
        index++;
        cb();
    }, function(err, results){
        cb(err, execution);
    });

}

const sendMessage = exports.sendMessage = function(attributes, message, cb) {

    var params = {
        DelaySeconds: 10,
        MessageAttributes: attributes,
        MessageBody: JSON.stringify(message),
        QueueUrl: env.aws.queues.incoming.url
    };

    sqs.sendMessage(params, function(err, data) {
        if (err) {
            cb(err);
        } else {
            cb(null, data.MessageId);
        }
    });
};

const receiveMessage = exports.receiveMessage = function(message, cb) {

    var messageDetails = {
        messageId: message.MessageId,
        attributes: message.MessageAttributes,
        inputs: JSON.parse(message.Body).inputs,
        contract: JSON.parse(message.Body).contract,
        addresses: JSON.parse(message.Body).address
    };

    messageDetails.attributes.clause_uuid = messageDetails.attributes.clause_uuid.StringValue;
    messageDetails.attributes.execution_uuid = messageDetails.attributes.execution_uuid.StringValue;
    messageDetails.attributes.integration_uuid = messageDetails.attributes.integration_uuid.StringValue;

    cb(null, messageDetails);
};

const getAccountIntegrationOptions = exports.getAccountIntegrationOptions = function(userId, integrationUuid, cb) {
    
    async.waterfall([
        function(cb) {
            integrationModel.selectAccountIntegrationOptions(conn, userId, integrationUuid, function(err, results) {
                if (err) {
                    return cb(err);
                } 

                if (typeof(results) !== 'undefined'){
                    cb(null,results);
                } else {
                    cb('Integration options not found');
                }
            });
        },
        function(options,cb){
            cb(null, options);
        }
    ], function(err, results){
        if (err) {
            cb(err);
        } else {
            cb(null, results);
        }
    });
}

const getAccountIntegrationOption = exports.getAccountIntegrationOption = function(userId, integrationUuid, integrationOptionUuid, cb) {
    
    async.waterfall([
        function(cb) {
            integrationModel.selectIntegrationOption(conn, userId, integrationUuid, integrationOptionUuid, function(err, integrationOption) {
                if (err) {
                    return cb(err);
                } 
                if (typeof(integrationOption) !== 'undefined'){
                    cb(null, integrationOption);
                } else {
                    cb('Integration option not found');
                }
            });
        },
        function(integrationOption, cb) {
            if(integrationOption.length > 0){
                integrationOption = integrationOption[0];
                // check if this option can be deleted by fetching associated clauses
                integrationModel.selectIntegrationOptionClauses(conn, userId, integrationOptionUuid, function(err, results) {
                    if (err) {
                        return cb(err);
                    } 

                    if(results.length > 0) {
                        integrationOption.canDelete = false;
                        integrationOption.clause = results;
                    } else {
                        integrationOption.canDelete = true;
                        integrationOption.clause = [];
                    }
                    cb(null,integrationOption);
                });
            } else {
                cb(null, null);
            }
        },
        // get executions
        function(integrationOption, cb){
            integrationModel.selectIntegrationOptionExecution(conn, userId, integrationOptionUuid, function(err, results) {
                if (err) {
                    return cb(err);
                } 

                if(results.length > 0) {
                    integrationOption.execution = results;
                    cb(null,integrationOption);
                } else {
                    integrationOption.execution = [];
                    cb(null,integrationOption);
                }
            });
        },
        // get chart labels and data
        function(integrationOption, cb){
            chart.integrationOptionExecutions(integrationOption, function(err, labels, data){
                if (err) {
                    return cb(err);
                }

                if(labels && data){
                    integrationOption.chart = {labels: labels, data: data};
                } else {
                    integrationOption.chart = {};
                }
                cb(null, integrationOption);
            });
        }
    ], function(err, results){
        if (err) {
            cb(err);
        } else {
            cb(null, results);
        }
    });
}

const updateAccountIntegrationOption = exports.updateAccountIntegrationOption = function(userId, integrationUuid, integrationOptionUuid, integrationOptionUpdate, cb) {
    
    async.waterfall([
        function(cb) {
            validateIntegrationOption(integrationOptionUpdate, function(err, integrationOptionUpdate) {
                if(integrationOptionUpdate === false) {
                    cb('invalid integration option');
                } else {
                    cb(null, integrationOptionUpdate);
                }
            });
        },
        // get the integrationOption
        function(integrationOptionUpdate, cb){
            getAccountIntegrationOption(userId, integrationUuid, integrationOptionUuid, function(err, integrationOptionDetails){
                if (err) {
                    cb(err);
                } else { 
                    if (!integrationOptionDetails) {
                        cb('invalid integration option', null);
                    } else {
                        cb(null, integrationOptionUpdate, integrationOptionDetails);
                    }
                }
            })
        },
        // confirm each input field is valid and update
        function(integrationOptionUpdate, integrationOptionDetails, cb){
            // delete all the extraneous stuff
            // if the integration is a webform, delete the value
            if(integrationOptionDetails.integration_uuid === '8816bc38-f276-11e8-9835-48d705d43a11') {
                delete(integrationOptionDetails.value);
            }

            delete(integrationOptionDetails.uuid);
            delete(integrationOptionDetails.clause);
            delete(integrationOptionDetails.chart);
            delete(integrationOptionDetails.execution);
            delete(integrationOptionDetails.canDelete);
            delete(integrationOptionDetails.integration_uuid);
            delete(integrationOptionDetails.integration_name);
            delete(integrationOptionDetails.integration_description);

            async.forEach(Object.keys(integrationOptionUpdate), function(field, cb) {
                if(integrationOptionDetails.hasOwnProperty(field)){
                    integrationOptionDetails[field] = integrationOptionUpdate[field];
                    cb();
                } else {
                    cb('invalid input field [' + field + ']');
                    logger.warn(util.log(['s', 'lib/lib.user', 'updateContract',
                        'Invalid field in contract update', {'integrationOptionUpdate': integrationOptionUpdate}]));
                }
            }, function(err){
                if(err){
                    cb(err);
                } else {
                    // delete the created, updated
                    delete(integrationOptionDetails.created);
                    delete(integrationOptionDetails.updated);
                    // if 
                    cb(null, integrationOptionDetails);
                }
            });
        },
        function(integrationOptionDetails, cb) {
            integrationModel.updateAccountIntegrationOption(conn, userId, integrationOptionUuid, integrationOptionDetails, function(err, results) {
                if (err) {
                    console.log(err)
                    cb('unable to update integration option');
                    logger.error(util.log(['s', 'lib/lib.integration', 'updateAccountIntegrationOption',
                        'Update integration option failed', {'integrationOptionUuid': integrationOptionUuid}]));
                } else {
                    cb(null, results);
                    logger.verbose(util.log(['s', 'lib/lib.integration', 'updateAccountIntegrationOption',
                        'Update integration option succeeded', {'integrationOptionUuid': integrationOptionUuid}]));
                }
            });
        }
    ], function(err, results){
        if (err) {
            if(results === null) {
                cb(null, null);
            } else {
                cb(err);
            }
        } else {
            getAccountIntegrationOption(userId, integrationUuid, integrationOptionUuid, function(err, results){
                if (err) {
                    cb(err);
                } else { 
                    if (!results) {
                        cb('invalid integration option');
                    } else {
                        cb(null, results);
                    }
                }
            });
        }
    });
}

const deleteAccountIntegrationOption = exports.deleteAccountIntegrationOption = function(userId, integrationOptionUuid, cb) {

    // CONFIRM OPTION CAN BE DELETED

    integrationModel.deleteAccountIntegrationOption(conn, userId, integrationOptionUuid, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.integration', 'deleteIntegrationOption',
                'Delete Integration option failed', {'integrationOptionUuid': integrationOptionUuid, 'error': err}]));
        } else {
            cb(null, results);
            logger.verbose(util.log(['s', 'lib/lib.integration', 'deleteIntegrationOption',
                'Integration option deleted', {'integrationOptionUuid': integrationOptionUuid, 'results': results}]));
        }
    });

}

const getContractClause = exports.getContractClause = function(integrationUuid, cb) {
    integrationModel.selectContractClause(conn, integrationUuid, function(err, results) {
        if (err) {
            if(results === null){
                return cb(null, null);
            } else {
                return cb(err);
            }
        } 

        if (typeof(results) !== 'undefined'){
            cb(null,results);
        } else {
            cb('Integration resource not found');
        }
    });
}

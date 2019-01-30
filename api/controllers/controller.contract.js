'use strict';

const async = require('async');

const auth = require('../../lib/lib.auth');
const contract = require('../../lib/lib.contract');
const user = require('../../lib/lib.user');
const account = require('../../lib/lib.account');
const validate = require('../../lib/lib.validate');

exports.getContractUser = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'listContracts',
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
        // get contracts
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if ('contractUuid' in req.params) {
                var param = {'c.uuid': req.params.contractUuid}
            }

            contract.getContractUser(userId, param, function(err, contracts){
                if(err){
                    cb(err);
                } else {
                    if ('contractUuid' in req.params) {
                        contracts = contracts[0];
                        cb(null, contracts);
                    } else {
                        cb(null, contracts);
                    }
                }
            })
        }
    ], function(err, contracts) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if(contracts) {
                res.status('200').json(contracts);
            } else {
                if ('contractUuid' in req.params) {
                    res.status('404').json({'error':'contract not found'});
                } else {
                    res.status('404').json([]);
                }
            }
        }
    });

};

exports.viewContract = function(req, res) {

    async.waterfall([
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
            auth.validateResource(req, 'contractUuid', resources, function(err, value) {
                if (err) {
                    return cb(err);
                }
                cb(null, value);
            });
        },
        // look up contract
        function(contractUuid, cb) {
            contract.getContract(contractUuid, function(err, contractDetails) {
                if (err) {
                    return cb(err);
                }
                cb(null, contractDetails);
            });
        },
    ],
    function(err, contractDetails){
        if (err) {
            return res.status(err.status).send({'error': err.message});
        }
        res.send(contractDetails);

    });

}

const setContract = exports.setContract = function(req, res) {
    // VALIDATE BODY
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.contract', 'authCheck',
                        'SubId validation error', {subId: util.hide(subId)}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // update the contract
        function(subId, cb) {
            contract.updateContract(1, req.params.contractUuid, req.body, function(err, contractDetails) {
                if (err) {
                    cb(err);
                } else {
                    if (contractDetails) {
                        cb(null, contractDetails);
                    } else {
                        cb(null, false);
                    }
                }
            });
        }
    // return contract details
    ], function(err, contractDetails){
        if(err) {
            res.status('422').send({'error': err});
        } else {
            if(contractDetails){
                res.status('200').send(contractDetails);
            } else {
                res.status('422').send({'error': err});
            }
        }
    });
}

exports.createContract = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'createContract',
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
        // get the account
        function(userId, cb) {
            account.getUser({'u.id': userId},function(err, results){
                cb(null, results.id);
            })
        },
        // create contract
        function(accountId, cb){
            contract.createAccountContract(accountId, req.body, function(err, results){
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            })
        }
    ], function(err, results) {
        if(err) {
            res.status('422').send(err);
        } else {
            res.status('200').send({'success': 'Created contract', 'contract': results});
        }
    });

}

const deleteContract = exports.deleteContract = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.contract', 'deleteContract',
                        'SubId validation error', {subId: util.hide(subId)}]));
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
        // delete the user
        function(userId, cb) {
            contract.deleteContract(userId, req.params.contractUuid, function(err, results) {
                if (err) {
                    cb(err);
                } else {
                    if (results) {
                        cb(null, true);
                    } else {
                        cb(null, false);
                    }
                }
            });
        }
    // return result
    ], function(err, results){
        if(err) {
            res.status('422').send({'error': err});
        } else {
            if(results){
                res.status('200').send({'success': 'contract deleted'});
            } else {
                res.status('404').send({'error': 'contract not found'});
            }
        }
    });
}
'use strict';

const async = require('async');

const auth = require('../../lib/lib.auth');
const clause = require('../../lib/lib.clause');
const user = require('../../lib/lib.user');
const account = require('../../lib/lib.account');
const validate = require('../../lib/lib.validate');

exports.getContractClauses = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'getContractClauses',
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

            if (!('contractUuid' in req.params)) {
                cb('missing required params');
            } else {
                clause.getContractClauses(userId, req.params.contractUuid, function(err, clauses){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, clauses);
                    }
                });
            }
        }
    ], function(err, clauses) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').json(clauses);
        }
    });

}

exports.createContractClause = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'createContractClause',
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

            if (!('contractUuid' in req.params) || !('clauseUuid' in req.params)) {
                cb('missing required params');
            } else {
                clause.createContractClause(userId, req.params.contractUuid, req.params.clauseUuid,
                    function(err, results){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, results);
                    }
                });
            }
        }
    ], function(err, results) {
        if(err) {
            res.status('422').json({'error': err});
        } else {
            res.status('200').json({'success': 'Added clause to contract', 'clause': results});
        }
    });

}

exports.setContractClause = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'setContractClause',
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

            if (!('contractUuid' in req.params) || !('clauseUuid' in req.params)) {
                cb('missing required params');
            } else {
                clause.updateContractClause(userId, req.params.contractUuid, req.params.clauseUuid,
                    req.body, function(err, results){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, results);
                    }
                });
            }
        }
    ], function(err, results) {
        if(err) {
            res.status('422').json({'error': err});
        } else {
            res.status('200').json({'success': 'Updated contract clause', 'clause': results});
        }
    });

}

exports.getContractClause = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'getContractClause',
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

            if (!('contractUuid' in req.params) || !('contractClauseUuid' in req.params)) {
                cb('missing required params');
            } else {

                clause.getContractClause(userId, req.params.contractUuid, req.params.contractClauseUuid,
                    function(err, clauseDetails){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, clauseDetails);
                    }
                });
            }
        }
    ], function(err, clauseDetails) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').json(clauseDetails);
        }
    });

}

exports.getContractClauseAddress = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'getContractClauseAddress',
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

            if (!('contractUuid' in req.params) || !('clauseUuid' in req.params)) {
                cb('missing required params');
            } else {
                clause.getContractClauseChainAddresses(userId, req.params.contractUuid, req.params.clauseUuid,
                    function(err, clauseAddressDetails){
                    if(err){
                        cb(err);
                    } else {
                        cb(null, clauseAddressDetails);
                    }
                });
            }
        }
    ], function(err, clauseAddressDetails) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').json(clauseAddressDetails);
        }
    });

}

exports.getContractClauseIntegration = function(req, res) {

    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.contract', 'getContractClauseIntegration',
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

            if (!('contractUuid' in req.params) || !('clauseUuid' in req.params) || !('direction' in req.query)) {
                cb('missing required params');
            } else {
                if (['in', 'out', 'both', 'in,both', 'out,both'].indexOf(req.query.direction) < 0) {
                    cb('invalid direction parameter');
                } else {
                    clause.getContractClauseIntegration(userId, req.params.contractUuid, req.params.clauseUuid,
                        req.query.direction, function(err, clauseIntegrationDetails){
                        if(err){
                            cb(err);
                        } else {
                            cb(null, clauseIntegrationDetails);
                        }
                    });
                }
            }
        }
    ], function(err, clauseIntegrationDetails) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if(clauseIntegrationDetails.length > 0) {
                res.status('200').json(clauseIntegrationDetails);
            } else {
                res.status('404').json({'error': 'integrations not found'});
            }
        }
    });

}

const deleteContractClause = exports.deleteContractClause = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.clause', 'deleteContractClause',
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
            if (!('contractUuid' in req.params) || !('contractClauseUuid' in req.params)) {
                cb('missing required params');
            } else {
                clause.deleteContractClause(userId, req.params.contractUuid, req.params.contractClauseUuid, 
                    function(err, results) {
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
        }
    // return result
    ], function(err, results){
        if(err) {
            res.status('422').send({'error': err});
        } else {
            if(results){
                res.status('200').send({'success': 'contract clause deleted'});
            } else {
                res.status('404').send({'error': 'contract clause not found'});
            }
        }
    });
}

const deleteContractClauseIntegration = exports.deleteContractClauseIntegration = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.clause', 'deleteContractClauseIntegration',
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
            if (!('contractUuid' in req.params) || !('contractClauseUuid' in req.params) || !('contractClauseIntegrationUuid' in req.params)) {
                cb('missing required params');
            } else {
                clause.deleteContractClauseIntegration(userId, req.params.contractUuid, req.params.contractClauseUuid, req.params.contractClauseIntegrationUuid, 
                    function(err, contractClauseUuid) {
                    if (err) {
                        cb(err);
                    } else {
                        if (contractClauseUuid) {
                            cb(null, contractClauseUuid);
                        } else {
                            cb(null, false);
                        }
                    }
                });
            }
        }
    // return result
    ], function(err, results){
        if(err) {
            res.status('422').send({'error': err});
        } else {
            if(results){
                res.status('200').send({'success': 'contract clause integration deleted', 'integration_uuid': results});
            } else {
                res.status('404').send({'error': 'contract clause integration not found'});
            }
        }
    });
}
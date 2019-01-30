'use strict';

const async = require('async');

const auth = require('../../lib/lib.auth');
const message = require('../../lib/lib.message');
const user = require('../../lib/lib.user');
const validate = require('../../lib/lib.validate');

exports.createUserMessage = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.message', 'createUserMessage',
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
        // get messages
        function(userId, cb){
            message.createUserMessage(userId, req.body, function(err, results){
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            })
        }
    ], function(err, results) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if (results === true) {
                res.status('200').send({'success': 'Created user message'});
            } else {
                res.status('200').send({'success': 'No user message created'});
            }
        }
    });
}

exports.getUserMessages = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.message', 'getUserMessages',
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
        // get messages
        function(userId, cb){

            // if params does not exist as a key in req, add it
            if (!('params' in req)) {
                req.params = {};
            }

            if ('messageUuid' in req.params) {
                var param = {'m.uuid': req.params.messageUuid}
            } else if (('query' in req) && ('is_read' in req.query)
                && (parseInt(req.query.is_read) === 1 || parseInt(req.query.is_read) === 0)) {
                var param = {'um.is_read': req.query.is_read}
            } else {
                var param = null;
            }

            if (('query' in req) && ('limit' in req.query)) {
                var limit = req.query.limit;
            } else {
                var limit = null;
            }

            message.getUserMessages(userId, param, limit, function(err, messages){
                if(err){
                    cb(err);
                } else {
                    if ('messageUuid' in req.params) {
                        messages = messages.messages[0];
                        cb(null, messages);
                    } else {
                        cb(null, messages);
                    }
                }
            })
        }
    ], function(err, messages) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').send(JSON.stringify(messages));
        }
    });
};

exports.setUserMessage = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.message', 'getUserMessages',
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
        // get messages
        function(userId, cb){
            message.updateUserMessage(userId, {'m.uuid': req.params.messageUuid}, {'is_read': req.body.is_read}, function(err, messages){
                if(err){
                    cb(err);
                } else {
                    cb(null, messages);
                }
            })
        }
    ], function(err, messages) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').send(JSON.stringify(messages));
        }
    });
};

exports.deleteUserMessage = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.message', 'deleteUserMessages',
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
        // get messages
        function(userId, cb){
            message.deleteUserMessage(userId, {'uuid': req.params.messageUuid}, function(err, results){
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            })
        }
    ], function(err, results) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if (results) {
                res.status('200').send({'success': 'user message deleted'});
            } else {
                res.status('404').send({'error': 'user message not found'});
            }
        }
    });
};
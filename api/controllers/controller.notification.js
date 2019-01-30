'use strict';

const async = require('async');

const auth = require('../../lib/lib.auth');
const notification = require('../../lib/lib.notification');
const user = require('../../lib/lib.user');
const validate = require('../../lib/lib.validate');

exports.getUserNotifications = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.message', 'getUserNotifications',
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

            if ('notificationUuid' in req.params) {
                var param = {'n.uuid': req.params.messageUuid}
            } else if (('query' in req) && ('is_read' in req.query)
                && (parseInt(req.query.is_read) === 1 || parseInt(req.query.is_read) === 0)) {
                var param = {'un.is_read': req.query.is_read}
            } else {
                var param = null;
            }

            if (('query' in req) && ('limit' in req.query)) {
                var limit = req.query.limit;
            } else {
                var limit = null;
            }

            notification.getUserNotifications(userId, param, limit, function(err, notifications){
                if(err){
                    cb(err);
                } else {
                    if ('notificationUuid' in req.params) {
                        notifications = notifications.notifications[0];
                        cb(null, notifications);
                    } else {
                        cb(null, notifications);
                    }
                }
            })
        }
    ], function(err, notifications) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').send(JSON.stringify(notifications));
        }
    });
};

exports.setUserNotifications = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.notification', 'setUserNotifications',
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
            notification.updateUserNotifications(userId, function(err, results){
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
                res.status('200').send({'success': 'Updated user notifications'});
            } else {
                res.status('200').send({'success': 'No user notifications to update'});
            }
        }
    });
};

exports.createUserNotification = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.notification', 'createUserNotifications',
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
            notification.createUserNotification(userId, req.body, function(err, results){
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            })
        }
    ], function(err, results) {
        if(err) {
            res.status('422').send({'error': err});
        } else {
            if (results === true) {
                res.status('200').send({'success': 'Created user notification'});
            } else {
                res.status('200').send({'success': 'No user notification created'});
            }
        }
    });
}

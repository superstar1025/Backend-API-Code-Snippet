'use strict';
const async = require('async');
const conn = require('./lib.db');

const notificationModel = require('./models/lib.model.notification');
const logger = require('./lib.logger');
const util = require('./lib.util');
const validate = require('./lib.validate');
const socket = require('./lib.socket');

const validateNotification = exports.validateNotification = function(notification, cb) {

    var data =[
        [notification, 'notification_type', /^(account|start|finish|error)$/],
        [notification, 'body', /^[a-zA-Z-'\s]+$/],
        [notification, 'notification_source', /^(account|contract|integration|execution)$/],
        [notification, 'notification_source_uuid', /^[a-f0-9\-]{36}$/, true]
    ];

    validate.validateObject(data,function(err,result){
        if (err) {
            cb(err);
        } else {
            if(result === true) {
                cb(null, notification);
            } else {
                cb(true, false);
            }
        }
    });
}

const createUserNotification = exports.createUserNotification = function(userId, notification, cb) {
    async.series([
        function(cb) {
            validateNotification(notification, function(err, notification) {
                if(err){
                    cb(err);
                } else {
                    if(!notification){
                        cb('Invalid notification');
                    } else {
                        cb();
                    }
                }
            });
        },
        function(cb) {
            notificationModel.insertUserNotification(conn, userId, notification, function(err, results) {
                if (err) {
                    cb(err);    
                    logger.error(util.log(['s', 'lib/lib.notification', 'createUserNotification',
                        'Create user notifications failed', {'param': param, 'error': err}]));
                } else {
                    if (results > 0) {
                        logger.verbose(util.log(['s', 'lib/lib.notification', 'createUserNotification',
                            'User notification created', {'userId': userId, 'notification': notification}]));
                        socket.sendSocket(userId, results, 'notification', function(err, results){
                            if (err) {
                                cb(null, false);
                            } else {
                                cb(null, true);
                            }
                        })
                    } else {
                        cb(null, false);
                        logger.warn(util.log(['s', 'lib/lib.notification', 'createUserNotification',
                            'No user notification created', {'userId': userId}]));
                    }
                }
            });
        }
    ], function(err, results) {
        if (err) {
            cb(err, false);
        } else {
            cb(null, results[1]);
        }
    });
}

const getUserNotifications = exports.getUserNotifications = function(userId, param, limit, cb) {

    async.waterfall([
        // validate the inputs
        function(cb) {
            var inputs = {
                userId: userId
            }
            if (limit) {
                inputs.limit = limit;
            }
            var data =[
                [inputs, 'userId', /^[0-9]+$/],
                [inputs, 'limit', /^[0-9]+$/, true]
            ];

            validate.validateObject(data,function(err,result){
                if (err) {
                    cb(err);
                } else {
                    if(result === true) {
                        cb(null);
                    } else {
                        cb(true, false);
                    }
                }
            });
        },
        // get user notifications
        function(cb) {
            notificationModel.selectUserNotifications(conn, userId, param, limit, function(err, notifications) {
                if (err) {
                    cb(err);    
                    logger.error(util.log(['s', 'lib/lib.notification', 'getUserNotifications',
                        'Get user notifications failed', {'param': param, 'error': err}]));
                } else {
                    cb(null, notifications);
                }
            });
        },
        // add the url
        function(notifications, cb) {
            var i = 0;
            async.each(notifications, function(notification,cb){
                if (notification.notification_source === 'account') {
                    notifications[i].url = '/account';
                } else {
                    notifications[i].url = '/' + notification.notification_source + '/' + notification.notification_source_uuid;
                }
                i = i + 1;
                cb();
            }, function(err) {
                cb(null, notifications);
            });
        },
        // get the unread notification count
        function(notifications, cb) {
            notificationModel.selectUserNotificationsCount(conn, userId, {'un.is_read': 0}, function(err, counts) {
                if (counts < 1) {
                    counts = null;
                }
                var notificationSummary = {
                    notifications: notifications,
                    counts: {
                        alert: counts
                    }
                };
                cb(null, notificationSummary);
            });
        },
        // get the overall notification count and set flag
        function(notificationSummary, cb) {
            notificationModel.selectUserNotificationsCount(conn, userId, null, function(err, counts) {
                var flag = false;
                if (counts > 0) {
                    flag = true;
                }
                notificationSummary.counts.flag = flag;
                cb(null, notificationSummary);
            });
        }
    ], function(err, notificationSummary){
        if(err) {
            cb(err);
            logger.error(util.log(['s', 'lib/lib.notification', 'getUserNotifications',
                'Get user notifications failed', {'param': param, 'error': err}]));
        } else {
            cb(null, notificationSummary);
            logger.verbose(util.log(['s', 'lib/lib.notification', 'getUserNotifications',
                'Get user notifications succeeded', {'param': param}]));
        }
    });
}

const updateUserNotifications = exports.updateUserNotifications = function(userId, cb) {

    async.waterfall([
        // validate the inputs
        function(cb) {
            var inputs = {
                userId: userId
            }
            var data =[
                [inputs, 'userId', /^[0-9]+$/]
            ];

            validate.validateObject(data,function(err,result){
                if (err) {
                    cb(err, false);
                } else {
                    if(result === true) {
                        cb(null);
                    } else {
                        cb(true, false);
                    }
                }
            });
        },
        // get user notifications
        function(cb) {

            var param = {'is_read': 1};

            notificationModel.updateUserNotifications(conn, userId, param, function(err, results) {
                if (err) {
                    cb(err);    
                    logger.error(util.log(['s', 'lib/lib.notification', 'updateUserNotifications',
                        'Update user notifications failed', {'param': param, 'error': err}]));
                } else {
                    cb(null, results);
                }
            });
        }
    ], function(err, results) {
         if (results === true) {
            cb(null, true);
            logger.verbose(util.log(['s', 'lib/lib.notification', 'updateUserNotifications',
                'User notifications updated', {'results': results}]));
        } else {
            cb(err, false);
            logger.verbose(util.log(['s', 'lib/lib.notification', 'updateUserNotifications',
                'No user notifications updated', {'results': results}]));
         }
    });
}


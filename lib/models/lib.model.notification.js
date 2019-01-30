'use strict'

const async = require('async');
const logger = require('../lib.logger');
const util = require('../lib.util');

const selectUserNotifications = exports.selectUserNotifications = function(conn, userId, param, limit, cb) {

    var limitSql = '';

    if (limit) {
        limitSql = ' LIMIT ' + limit + ' ';
    }

    if (param) {
        var sql = 
            'SELECT n.uuid, n.notification_type, n.body, n.notification_source, n.notification_source_uuid, un.is_read, n.created, n.updated \
            FROM notification n \
            JOIN usr_notification un ON n.id = un.notification_id \
            WHERE ? AND ? \
            ORDER BY n.created DESC ' + limitSql;
        param = [{'un.usr_id': userId}, param];
    } else {
        var sql = 
            'SELECT n.uuid, n.notification_type, n.body, n.notification_source, n.notification_source_uuid, un.is_read, n.created, n.updated \
            FROM notification n \
            JOIN usr_notification un ON n.id = un.notification_id \
            WHERE ? \
            ORDER BY n.created DESC' + limitSql;
        param = {'un.usr_id': userId};
    }

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            var i = 0;
            async.each(results, function(message, cb) {
                util.friendlyTimeSince(message.created, function(err,time){
                    results[i].display_date = time;
                    i = i + 1;
                    cb();
                });
            }, function(err){
                cb(null, results);
            });
        }
    });

}

const selectUserNotificationsCount = exports.selectUserNotificationsCount = function(conn, userId, param, cb) {

    if (param) {
        var sql = 
            'SELECT COUNT(*) as count \
            FROM notification n \
            JOIN usr_notification un ON n.id = un.notification_id \
            WHERE ? AND ?';
        param = [{'un.usr_id': userId}, param];
    } else {
        var sql = 
            'SELECT COUNT(*) as count \
            FROM notification n \
            JOIN usr_notification un ON n.id = un.notification_id \
            WHERE ? \
            ORDER BY n.created DESC';
        param = {'un.usr_id': userId};
    }

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            cb(null, results[0].count);
        }
    });

}

const insertUserNotification = exports.insertUserNotification = function(conn, userId, notification, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            cb(err);
        }

        async.waterfall([
            function(cb){
                // insert the notification
                const sql = 'INSERT INTO notification \
                    (uuid, notification_type, body, notification_source, notification_source_uuid, created) \
                    VALUES \
                    ((SELECT UUID()),?,?,?,?,CURRENT_TIMESTAMP())';

                const param = [notification.notification_type, notification.body,
                    notification.notification_source, notification.notification_source_uuid];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, results.insertId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.notification',
                        'insertUserNotification', 'Insert notification', {'err': err, 'sql': sql,
                        'param': param, 'fields': fields, 'results': results}]));
                });
            },
            function(notificationId, cb){
                // insert the user-message reference
                const sql = 'INSERT INTO usr_notification (usr_id, notification_id, is_read, created) \
                    VALUES \
                    (?, ?, 0, CURRENT_TIMESTAMP())';

                const param = [userId, notificationId];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, notificationId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.notification',
                            'insertUserNotification', 'Insert usr_notification', {'err': err, 'sql': sql,
                            'param': param, 'fields': fields, 'results': results}]));
                });
            }
        ], function(err, notificationId){
            if (err) {
                cb(null, false);
                logger.debug(util.log(['s','lib/models/lib.model.notification',
                            'insertUserNotification', 'Rollback transaction']));
            } else {
                conn.commit(function(err) {
                    if (err) { 
                        conn.rollback(function() {
                            cb(err);
                            logger.debug(util.log(['s','lib/models/lib.model.notification',
                                'insertUserNotification', 'Rollback transaction']));
                        });
                    } else {
                        cb(null, notificationId);
                        logger.debug(util.log(['s','lib/models/lib.model.notification',
                            'insertUserNotification', 'Commit transaction']));
                    }
                });
            }
        });
    });
}

const updateUserNotifications = exports.updateUserNotifications = function(conn, userId, param, cb) {

    if (!userId){
        return cb('No userId provided');
    }

    var sql = 
        'UPDATE usr_notification \
        SET ? \
        WHERE ?';

    param = [param, {'usr_id': userId}];

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err, false);
        } else {
            if (results.changedRows > 0) {
                cb(null, true);
                logger.debug(util.log(['s','lib/models/lib.model.notification',
                    'updateUserNotifications', 'Updated user notifications', {'userId': userId, 'notifications updated': results.changedRows}]));
            } else {
                cb(null, false);
                logger.debug(util.log(['s','lib/models/lib.model.notification',
                    'updateUserNotifications', 'No user notifications to update', {'userId': userId}]));

            }
        }
    });

}

'use strict'

const async = require('async');
const logger = require('../lib.logger');
const util = require('../lib.util');

const selectUserMessages = exports.selectUserMessages = function(conn, userId, param, limit, cb) {

    var limitSql = '';

    if (limit) {
        limitSql = ' LIMIT ' + limit + ' ';
    }

    if (param) {
        var sql = 
            'SELECT m.uuid, m.subject, m.body, m.created, m.updated, um.is_read \
            FROM message m \
            JOIN usr_message um ON m.id = um.message_id \
            WHERE ? AND ? \
            ORDER BY m.created DESC ' + limitSql;
        param = [{'um.usr_id': userId}, param];
    } else {
        var sql = 
            'SELECT m.uuid, m.subject, m.body, m.created, m.updated, um.is_read \
            FROM message m \
            JOIN usr_message um ON m.id = um.message_id \
            WHERE ? \
            ORDER BY m.created DESC' + limitSql;
        param = {'um.usr_id': userId};
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

const selectUserMessagesCount = exports.selectUserMessagesCount = function(conn, userId, param, cb) {

    if (param) {
        var sql = 
            'SELECT COUNT(*) as count \
            FROM message m \
            JOIN usr_message um ON m.id = um.message_id \
            WHERE ? AND ?';
        param = [{'um.usr_id': userId}, param];
    } else {
        var sql = 
            'SELECT COUNT(*) as count \
            FROM message m \
            JOIN usr_message um ON m.id = um.message_id \
            WHERE ? \
            ORDER BY m.created DESC';
        param = {'um.usr_id': userId};
    }

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            cb(err);
        } else {
            cb(null, results[0].count);
        }
    });

}

const insertUserMessage = exports.insertUserMessage = function(conn, userId, message, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            cb(err);
        }

        async.waterfall([
            function(cb){
                // insert the message
                const sql = 'INSERT INTO message \
                    (uuid, subject, body, created) \
                    VALUES \
                    ((SELECT UUID()),?,?,CURRENT_TIMESTAMP())';

                const param = [message.subject, message.body];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, results.insertId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.message',
                        'insertUserMessage', 'Insert message', {'err': err, 'sql': sql,
                        'param': param, 'fields': fields, 'results': results}]));
                });
            },
            function(messageId, cb){
                // insert the user-message reference
                const sql = 'INSERT INTO usr_message (usr_id, message_id, is_read, created) \
                    VALUES \
                    (?, ?, 0, CURRENT_TIMESTAMP())';

                const param = [userId, messageId];

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, messageId);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.message',
                            'insertUserMessage', 'Insert usr_message', {'err': err, 'sql': sql,
                            'param': param, 'fields': fields, 'results': results}]));
                });
            }
        ], function(err, messageId){
            if (err) {
                cb(null, false);
                logger.debug(util.log(['s','lib/models/lib.model.message',
                            'insertUserMessage', 'Rollback transaction']));
            } else {
                conn.commit(function(err) {
                    if (err) { 
                        conn.rollback(function() {
                            cb(err);
                            logger.debug(util.log(['s','lib/models/lib.model.message',
                                'insertUserMessage', 'Rollback transaction']));
                        });
                    } else {
                        cb(null, messageId);
                        logger.debug(util.log(['s','lib/models/lib.model.message',
                            'insertUserMessage', 'Commit transaction']));
                    }
                });
            }
        });
    });

}

const updateUserMessage = exports.updateUserMessage = function(conn, param, message, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            return cb(err);
        }

        async.waterfall([
            // update the message
            function(cb){
                const sql = 'UPDATE message m \
                    JOIN usr_message um ON m.id = um.message_id \
                    SET m.uuid = ?, m.subject = ?, m.body = ?, um.is_read = ? \
                    WHERE ?';

                var params = [message.uuid, message.subject, message.body, message.is_read, param];

                conn.query(sql, params, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, results);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.message',
                        'updateUserMessage', 'Update message', {'err': err, 'sql': sql,
                        'param': param, 'fields': fields, 'results': results}]));
                });
            },
        ], function(err, results){
            if (err) {
                cb(null, false);
                logger.debug(util.log(['s','lib/models/lib.model.message',
                            'updateUserMessage', 'Rollback transaction']));
            } else {
                conn.commit(function(err) {
                    if (err) { 
                        conn.rollback(function() {
                            cb(err, false);
                            logger.debug(util.log(['s','lib/models/lib.model.message',
                                'updateUserMessage', 'Rollback transaction']));
                        });
                    } else {
                        cb(null, true);
                        logger.debug(util.log(['s','lib/models/lib.model.message',
                            'updateUserMessage', 'Commit transaction']));
                    }
                });
            }
        });
    });

}

const deleteUserMessage = exports.deleteUserMessage = function(conn, param, cb) {

    conn.beginTransaction(function(err){

        if (err) {
            return cb(err);
        }

        async.waterfall([
            // update the message
            function(cb){
                const sql = 'DELETE FROM message \
                    WHERE ?';

                conn.query(sql, param, function (err, results, fields) {
                    if (err) {
                        conn.rollback(function(){
                            cb(err);
                        });
                    } else {
                        cb(null, results);
                    }

                    logger.debug(util.log(['s','lib/models/lib.model.message',
                        'deleteUserMessage', 'Delete message', {'err': err, 'sql': sql,
                        'param': param, 'fields': fields, 'results': results}]));
                });
            },
        ], function(err, results){
            if (err) {
                cb(null, false);
                logger.debug(util.log(['s','lib/models/lib.model.message',
                            'deleteUserMessage', 'Rollback transaction']));
            } else {
                conn.commit(function(err) {
                    if (err) { 
                        conn.rollback(function() {
                            cb(err, false);
                            logger.debug(util.log(['s','lib/models/lib.model.message',
                                'deleteUserMessage', 'Rollback transaction']));
                        });
                    } else {
                        if(results.affectedRows > 0) {
                            cb(null, true);
                        } else {
                            cb(null, false);
                        }
                        logger.debug(util.log(['s','lib/models/lib.model.message',
                            'deleteUserMessage', 'Commit transaction']));
                    }
                });
            }
        });
    });

}
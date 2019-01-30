'use strict';
const async = require('async');
const conn = require('./lib.db');

const messageModel = require('./models/lib.model.message');
const logger = require('./lib.logger');
const util = require('./lib.util');
const validate = require('./lib.validate');
const socket = require('./lib.socket');

const validateUserMessage = exports.validateUserMessage = function(userMessage, cb) {

    var data =[
        [userMessage, 'subject', /^[0-9a-zA-Z-'\s]+$/],
        [userMessage, 'body', /^[0-9a-zA-Z-'\s]*$/],
        [userMessage, 'is_read', /^[0-1]{1}/]
    ];

    validate.validateObject(data,function(err,result){
        if (err) {
            cb(err);
        } else {
            if(result === true) {
                cb(null, userMessage);
            } else {
                cb(true, false);
            }
        }
    });

}

const createUserMessage = exports.createUserMessage = function(userId, message, cb) {

    // VALIDATE USERID and MESSAGE

    messageModel.insertUserMessage(conn, userId, message, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.message', 'createUserMessage',
                'Create user message failed', {'param': param, 'error': err}]));
        } else {
            if (results > 0) {
                logger.verbose(util.log(['s', 'lib/lib.message', 'createUserMessage',
                    'User message created', {'userId': userId, 'message': message}]));
                socket.sendSocket(userId, results, 'message', function(err, results){
                    if (err) {
                        cb(null, false);
                    } else {
                        cb(null, true);
                    }
                })
            } else {
                cb(null, false);
                logger.verbose(util.log(['s', 'lib/lib.message', 'createUserMessage',
                    'No user message created', {'userId': userId}]));
            }
        }
    });
}

const getUserMessages = exports.getUserMessages = function(userId, param, limit, cb) {

    // VALIDATE USERID, PARAM AND LIMIT

    messageModel.selectUserMessages(conn, userId, param, limit, function(err, messages) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.message', 'getUserMessages',
                'Get user messages failed', {'param': param, 'error': err}]));
        } else {
            var param = {'um.is_read': 0}
            messageModel.selectUserMessagesCount(conn, userId, param, function(err, counts) {
                var results = {
                    counts: {alert: counts, unread: counts},
                    messages: messages
                }

                messageModel.selectUserMessagesCount(conn, userId, null, function(err, counts) {
                    results.counts.total = counts;
                    cb(null, results);
                    logger.verbose(util.log(['s', 'lib/lib.message', 'getUserMessages',
                    'Get user messages succeeded', {'param': param}]));
                });
            });
        }
    });

}

exports.updateUserMessage = function(userId, param, userMessage, cb) {

    async.waterfall([
        // validate the userUpdate
        function(cb){
            util.validateJson(userMessage, function(userMessage){
                if (userMessage) {
                    cb(null, userMessage);
                    logger.verbose(util.log(['s', 'lib/lib.message', 'updateUserMessage',
                        'UserMessage update validated', {'userMessage': userMessage}]));
                } else {
                    cb('User update failed validation');
                    logger.warn(util.log(['s', 'lib/lib.message', 'updateUserMessage',
                        'UserMessage update failed validation', {'userMessage': userMessage}]));
                }
            })
        },
        // get the user
        function(userMessage, cb){
            // param is userId
            getUserMessages(userId, param, null, function(err, userMessageDetails){
                if (err) {
                    cb(err);
                } else { 
                    cb(null, userMessage, userMessageDetails.messages[0]);
                }
            })
        },
        // confirm each input field is valid and update
        function(userMessage, userMessageDetails, cb){
            // remove the updated helper 
            delete(userMessageDetails.display_date);
            async.forEach(Object.keys(userMessage), function(field, cb) {
                if(userMessageDetails.hasOwnProperty(field)){
                    userMessageDetails[field] = userMessage[field];
                    cb();
                } else {
                    cb('invalid input field [' + field + ']');
                    logger.warn(util.log(['u', 'lib/lib.message', 'updateUserMessage',
                        'Invalid field in user message update', {userMessage: userMessage}]));
                }
            }, function(err){
                if(err){
                    cb(err);
                } else {
                    cb(null, userMessageDetails);
                }
            });
        },
        // validate the user object
        function(userMessageDetails, cb){
            validateUserMessage(userMessageDetails, function(err, results) {
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            });
        },
        // delete extraneous fields
        function(userMessageDetails, cb){
            delete(userMessageDetails.created);
            delete(userMessageDetails.updated);
            cb(null, userMessageDetails);
        },
        // update the user in db
        function(userMessageDetails, cb){
            var param = {'m.uuid': userMessageDetails.uuid};
            messageModel.updateUserMessage(conn, param, userMessageDetails, function(err, results) {
                if (err) {
                    cb('unable to update user');
                    logger.error(util.log(['s', 'lib/lib.message', 'updateUserMessage',
                        'Update user message failed', {'userMessageDetails': userMessageDetails}]));
                } else {
                    cb(null, param);
                    logger.verbose(util.log(['s', 'lib/lib.message', 'updateUserMessage',
                        'Update user message succeeded', {'userMessageDetails': userMessageDetails}]));
                }
            });
        }
    ], function(err, param){
        if(err){
            cb(err, false);
        } else {
            // param is userId
            getUserMessages(userId, param, null, function(err, userMessageDetails){
                if (err) {
                    cb(err);
                } else { 
                    //delete(userMessageDetails.id);
                    cb(null, userMessageDetails.messages[0]);
                }
            })
        }
    });
}

const deleteUserMessage = exports.deleteUserMessage = function(userId, param, cb) {

    // VALIDATE USERID, PARAM AND LIMIT

    messageModel.deleteUserMessage(conn, param, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.message', 'deleteUserMessage',
                'Delete user message failed', {'param': param, 'error': err}]));
        } else {
            if (results === true) {
                cb(null, true);
                logger.verbose(util.log(['s', 'lib/lib.message', 'deleteUserMessage',
                    'User message deleted', {'param': param}]));
            } else {
                cb(null, false);
                logger.error(util.log(['s', 'lib/lib.message', 'deleteUserMessage',
                    'User message not found', {'param': param}]));
            }
        }
    });

}
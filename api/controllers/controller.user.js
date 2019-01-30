// Controller to handle incoming API requests related to users
// authCheck is an endpoint to debug authenticated API requests

'use strict';

const async = require('async');
const auth = require('../../lib/lib.auth');
const request = require('request');

const env = require('../../lib/lib.env');
const user = require('../../lib/lib.user');
const account = require('../../lib/lib.account');

const logger = require('../../lib/lib.logger');
const util = require('../../lib/lib.util');
const validate = require('../../lib/lib.validate');

const authCheck = exports.authCheck = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.user', 'authCheck',
                        'SubId validation error', {subId: util.hide(subId)}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // call the auth0 userinfo api to get user details
        function(subId, cb) {
            var options = {
                url: env.auth.userApiUrl,
                headers: {
                    'Authorization': req.header('Authorization'),
                    'Content-Type': 'application/json'
                }
            };
            request(options, function (error, response, body) {
                if(response.statusCode === 200) {
                    var userInfo = JSON.parse(body);
                    cb(null, subId, userInfo);
                    logger.verbose(util.log(['s', 'controllers/controller.user', 'authCheck',
                    'Auth0 returned user info', {subId: util.hide(subId)}]));
                } else {
                    cb('Auth0 failed');
                    logger.error(util.log(['s', 'controllers/controller.user', 'authCheck',
                    'Auth0 failed to auth', {subId: util.hide(subId), 'body': body}]));
                }
            });
        },
        // validate and process the response
        function(subId, userInfo,cb) {
            userInfo.auth_id = userInfo['sub'].split("|")[1]
            // confirm the sub ids match
            if(userInfo.auth_id === subId){
                var userInfoDetails = userInfo[env.auth.userApiKey + '/user_metadata'];
                userInfo.first_name = userInfoDetails.firstname;
                userInfo.last_name = userInfoDetails.lastname;
                userInfo.phone = userInfoDetails.phone;
                userInfo.email = userInfo.name;
                userInfo.marketing_pref = 0;
                delete(userInfo[env.auth.userApiKey + '/user_metadata']);
                delete(userInfo['picture']);
                delete(userInfo['name']);
                cb(null, userInfo);
                logger.verbose(util.log(['s', 'controllers/Controller.user', 'authCheck',
                    'Userinfo validated', {subId: util.hide(subId)}]));
            } else {
                cb('Userinfo failed validation');
                 logger.error(util.log(['s', 'controllers/Controller.user', 'authCheck',
                'Sub ids do not match', {OriginalsubId: util.hide(subId), Auth0subId: util.hide(userInfo.sub)}]));
            }

        },
        // fetch the user and account, and create if they do not exist
        function(userInfo, cb) {
            user.getUserAccount({'auth_id':userInfo.auth_id}, function(err, userAccount) {
                if (err) {
                    cb(err);
                } else {
                    if (userAccount) {
                        cb(null, userAccount);
                    } else {
                        user.createUser(userInfo, function(err, userAccount){
                            if (err) {
                                cb(err);
                            } else {
                                user.getUserAccount({'auth_id':userInfo.auth_id}, function(err, userAccount) {
                                    cb(null, userAccount);
                                });
                            }
                        });
                    }
                }
            });
        }
    // return Authorised, user details and a list of accounts
    ], function(err, userAccount){
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').send(userAccount);
        }
    });

};

const getUser = exports.getUser = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.user', 'authCheck',
                        'SubId validation error', {subId: util.hide(subId)}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // fetch the user and account, 
        function(subId, cb) {
            user.getUserAccount({'auth_id':subId}, function(err, userAccount) {
                if (err) {
                    cb(err);
                } else {
                    if (userAccount) {
                        cb(null, userAccount);
                    } else {
                        cb(null, false);
                    }
                }
            });
        }
    // return Authorised, user details and a list of accounts
    ], function(err, userAccount){
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            if(userAccount){
                res.status('200').send(userAccount);
            } else {
                res.status('404').send('Not found');
            }
        }
    });
}

const setUser = exports.setUser = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.user', 'authCheck',
                        'SubId validation error', {subId: util.hide(subId)}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // update the user
        function(subId, cb) {
            user.updateUser({'auth_id':subId}, req.body, function(err, userDetails) {
                if (err) {
                    cb(err);
                } else {
                    if (userDetails) {
                        cb(null, userDetails);
                    } else {
                        cb(null, false);
                    }
                }
            });
        }
    // return Authorised, user details and a list of accounts
    ], function(err, userDetails){
        if(err) {
            res.status('422').send({'error': err});
        } else {
            if(userDetails){
                res.status('200').send(userDetails);
            } else {
                res.status('422').send({'error': err});
            }
        }
    });
}

const deleteUser = exports.deleteUser = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['s', 'controllers/controller.user', 'authCheck',
                        'SubId validation error', {subId: util.hide(subId)}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // delete the user
        function(subId, cb) {
            user.deleteUser({'auth_id':subId}, function(err, results) {
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
    // return Authorised, user details and a list of accounts
    ], function(err, results){
        if(err) {
            console.log(err);
            res.status('422').send({'error': err});
        } else {
            if(results){
                res.status('200').send({'success': 'user deleted'});
            } else {
                res.status('404').send({'error': 'user not found'});
            }
        }
    });
}

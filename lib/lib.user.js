'use strict';
const async = require('async');
const request = require('request');
const conn = require('./lib.db');

const userModel = require('./models/lib.model.user');
const env = require('./lib.env');
const logger = require('./lib.logger');
const util = require('./lib.util');
const auth = require('./lib.auth');
const validate = require('./lib.validate');

const validateUser = exports.validateUser = function(user, cb) {
    var data =[
        [user, 'auth_id', /^[a-z0-9]{24}$/],
        [user, 'first_name', /^[a-zA-Z0-9-'\s]+$/],
        [user, 'last_name', /^[a-zA-Z0-9-'\s]+$/],
        [user, 'email', /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/],
        [user, 'password', /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z].*[a-z].*[a-z])/, true],
        [user, 'phone', /^[0-9\s]{7,15}$/],
        [user, 'marketing_pref', /^[0-1]{1}$/]
    ];

    validate.validateObject(data,function(err,result){
        if (err) {
            cb(err);
        } else {
            if(result === true) {
                cb(null, user);
            } else {
                cb(true, false);
            }
        }
    });
}

const getUser = exports.getUser = function(param, cb) {

    userModel.select(conn, param, function(err, results) {
        if (err) {
            cb(err);    
            logger.error(util.log(['s', 'lib/lib.user', 'getUser',
                'Get user failed', {'param': param, 'error': err}]));
        } else {
            if(!results){
                cb('get user failed');
                logger.error(util.log(['s', 'lib/lib.user', 'getUser',
                    'Get user failed', {'param': param, 'error': err}]));
            } else {
                cb(null, results);
                logger.verbose(util.log(['s', 'lib/lib.user', 'getUser',
                    'Get user succeeded', {'param': param}]));
            }
        }
    });

}

exports.getUserAccount = function(param, cb) {

    userModel.selectAccount(conn, param, function(err, results) {
        if (err) {
            cb('unable to get user');    
            logger.error(util.log(['s', 'lib/lib.user', 'getUser',
                'Get user failed', {'param': param, 'error': err}]));
        } else {
            if (!results) {
                cb(null, false);
                logger.warn(util.log(['s', 'lib/lib.user', 'getUser',
                    'User and account not found', {'param': param}]));
            } else {
                cb(null, results);
                logger.verbose(util.log(['s', 'lib/lib.user', 'getUser',
                    'User and account returned', {'param': param}]));
            }
        }
    });

}

exports.createUser = function(user, cb) {

    // generate a new uuid
    util.uuid(conn, function(err, uuid) {
        user.uuid = uuid;
        async.series([
            function(cb) {
                validateUser(user, function(err, user) {
                    if(err){
                        cb(err);
                    } else {
                        if(!user){
                            cb('Invalid user');
                        } else {
                            cb();
                        }
                    }
                });
            },
            function(cb) {
                userModel.insertUserAccount(conn, user, function(err, userId) {
                    if (err) {
                        cb('Unable to create user');
                        logger.error(util.log(['s', 'lib/lib.user', 'createUser',
                            'Create user failed', {'email': util.hide(user.email), 'error': err}]));
                    } else {
                        cb(null, userId);
                        logger.verbose(util.log(['s', 'lib/lib.user', 'createUser',
                            'Create user succeeded', {'email': util.hide(user.email)}]));
                    }
                });
            }
        ], function(err, results) {
            if (err) {
                cb(err);
            } else {
                cb(null, parseInt(results[1]));
            }
        });
    });

}

exports.updateUser = function(param, userUpdate, cb) {

    async.waterfall([
        // validate the userUpdate
        function(cb){
            util.validateJson(userUpdate, function(userUpdate){
                if (userUpdate) {
                    cb(null, userUpdate);
                    logger.verbose(util.log(['s', 'lib/lib.user', 'updateUser',
                        'User update validated', {'userUpdate': userUpdate}]));
                } else {
                    cb('User update failed validation');
                    logger.warn(util.log(['s', 'lib/lib.user', 'updateUser',
                        'User update failed validation', {'userUpdate': userUpdate}]));
                }
            })
        },
        // get the user
        function(userUpdate, cb){
            getUser(param, function(err, userDetails){
                if (err) {
                    cb(err);
                } else { 
                    cb(null, userUpdate, userDetails);
                }
            })
        },
        // confirm each input field is valid and update
        function(userUpdate, userDetails, cb){
            async.forEach(Object.keys(userUpdate), function(field, cb) {
                if(userDetails.hasOwnProperty(field) || field === 'password'){
                    userDetails[field] = userUpdate[field];
                    cb();
                } else {
                    cb('invalid input field [' + field + ']');
                    logger.warn(util.log(['s', 'lib/lib.user', 'updateUser',
                        'Invalid field in user update', {'email': util.hide(userDetails.email)}]));
                }
            }, function(err){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails);
                }
            });
        },
        // validate the user object
        function(userDetails, cb){
            validateUser(userDetails, function(err, results) {
                if(err){
                    cb(err);
                } else {
                    cb(null, results);
                }
            });
        },
        // update the user in auth0
        function(userDetails, cb){
            // we don't allow email to be updated
            delete(userDetails.email);
            delete(userDetails.created);
            delete(userDetails.updated);
            if('password' in userDetails || 'first_name' in userDetails || 'last_name' in userDetails){
                auth.getServerToken(function(err, token){
                    if(err) {
                        cb(err);
                    } else {
                        var options = {
                            method: 'PATCH',
                            url: env.auth.apiUrl + '/api/v2/users/auth0|' + userDetails.auth_id,
                            headers: {
                                'content-type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            json: {}
                        };
                        if ('password' in userDetails) {
                            options.json.password = userDetails.password;
                        }
                        if ('first_name' in userDetails) {
                            if ('user_metadata' in options.json) {
                                options.json.user_metadata.firstname = userDetails.first_name;
                            } else {
                                options.json.user_metadata = {firstname: userDetails.first_name};
                            }
                        }
                        if ('last_name' in userDetails) {
                            if ('user_metadata' in options.json) {
                                options.json.user_metadata.lastname = userDetails.last_name;
                            } else {
                                options.json.user_metadata = {lastname: userDetails.last_name};
                            }
                        }
                        if ('phone' in userDetails) {
                            if ('user_metadata' in options.json) {
                                options.json.user_metadata.phone = userDetails.phone;
                            } else {
                                options.json.user_metadata = {phone: userDetails.phone};
                            }
                        }

                        request(options, function (err, response, body) {
                            if (err) {
                                cb(err);
                                logger.error(util.log(['s', 'lib/lib.user', 'updateUser',
                                'Update user failed', {'err': err}]));
                            } else {
                                if (response.statusCode != 200) {
                                logger.warn(util.log(['s', 'lib/lib.user', 'updateUser',
                                    'Update user failed', {'body': JSON.stringify(body)}]));
                                    cb(body.errorCode);
                                } else {
                                    cb(null, userDetails);
                                }
                            }
                        });
                    }
                });
            } else {
                cb(null, userDetails);
            }
        },
        // update the user in db
        function(userDetails, cb){
            var param = {'id': userDetails.id};
            // password isn't stored in the db
            delete(userDetails.password);
            userModel.update(conn, param, userDetails, function(err, results) {
                if (err) {
                    cb('unable to update user');
                    logger.error(util.log(['s', 'lib/lib.user', 'updateUser',
                        'Update user failed', {'param': param}]));
                } else {
                    cb(null, param);
                    logger.verbose(util.log(['s', 'lib/lib.user', 'updateUser',
                        'Update user succeeded', {'param': param}]));
                }
            });
        }
    ], function(err, param){
        if(err){
            cb(err, false);
        } else {
            getUser(param, function(err, userDetails){
                if (err) {
                    cb(err);
                } else { 
                    delete(userDetails.id);
                    cb(null, userDetails);
                }
            })
        }
    });
}

exports.deleteUser = function(param, cb) {

    userModel.del(conn, param, function(err, results) {
        if (err) {
            cb('unable to get user');    
            logger.error(util.log(['s', 'lib/lib.user', 'deleteUser',
                'Delete user failed', {'param': param, 'error': err}]));
        } else {
            if (!results) {
                cb(null, false);
                logger.warn(util.log(['s', 'lib/lib.user', 'deleteUser',
                    'User not deleted', {'param': param}]));
            } else {
                // delete in auth0
                auth.getServerToken(function(err, token){
                    if(err) {
                        cb(err);
                    } else {
                        var options = {
                            method: 'DELETE',
                            url: env.auth.apiUrl + '/api/v2/users/auth0|' + param.auth_id,
                            headers: {
                                'content-type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            }
                        };
                        request(options, function (err, response, body) {
                            if (err) {
                                cb(err);
                                logger.error(util.log(['s', 'lib/lib.user', 'deleteUser',
                                    'Update delete failed', {'err': err}]));
                            } else {
                                if (response.statusCode != 204) {
                                logger.warn(util.log(['s', 'lib/lib.user', 'deleteUser',
                                    'Update delete failed', {'body': JSON.stringify(body)}]));
                                    cb(body.errorCode);
                                } else {
                                    cb(null, true);
                                     logger.verbose(util.log(['s', 'lib/lib.user', 'deleteUser',
                                        'User deleted', {'param': param}]));
                                }
                            }
                        });
                    }
                });
            }
        }
    });

}

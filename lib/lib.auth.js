// Library to manage the authentication and authorization of users,
// and user registration
//
// - Manage JSON web tokens
// - Manage credentials (email and password)
// - Auth requests
// - Manage users
// - Manage authorized resources

'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cryptojs = require('crypto-js');
const async = require('async');
const request = require('request');

const env = require('./lib.env');
const logger = require('./lib.logger');
const conn = require('./lib.db');
const util = require('./lib.util');

const userModel = require('./models/lib.model.user');

// Manage JSON web tokens (JWT)
const generateJwt = exports.generateJwt = function(payload, cb) {
    const token = jwt.sign(payload, env.auth.secret, {expiresIn: env.auth.jwtExpiry});
    cb(null, token);
};

const validateJwt = exports.validateJwt = function(encoded, cb) {
    util.regexMatch(encoded, /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/, function(err, result) {
        if (err) {
            return cb(err);
        }
        if(!result) {
            cb(null);
            logger.warn(util.log(['u', 'lib/lib.auth', 'validateJwt',
                'JWT failed validation', {jwt: util.hide(encoded)}]));
        } else {
            cb(null, encoded);
            logger.verbose(util.log(['u', 'lib/lib.auth', 'validateJwt',
                'JWT validated', {token: util.hide(encoded)}]));
        }
    });
};

const verifyJwt = exports.verifyJwt = function(token, cb) {
    jwt.verify(token, env.auth.secret, function(err, decoded) {
        if(err) {
            cb(null, false);
            logger.warn(util.log(['u', 'lib/lib.auth', 'verifyJwt',
                'JWT failed verification', {'token': util.hide(token)}]));
        } else {
            cb(null, decoded);
            logger.verbose(util.log(['u', 'lib/lib.auth', 'verifyJwt',
                'JWT verified', {token: util.hide(token)}]));
        }
    });
};

const getServerToken = exports.getServerToken = function(cb) {
    var options = {
        url: 'https://blocktetris.eu.auth0.com/oauth/token',
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        }
    };

    options.body = JSON.stringify({
        "client_id":"UVWiAe5hOno5WQXUTC6Hq2wVI119vzCs",
        "client_secret":"VrZqyR6QslujP3hDjxVQD8m9uN-LyUJ4XtGiTPlTjzfSfwygjy847gqUrp5p2nCV",
        "audience":"https://blocktetris.eu.auth0.com/api/v2/",
        "grant_type":"client_credentials"
    });
   
    request(options, function(err, res, body){
        if(err){
            cb(err);
        } else {
            body = JSON.parse(body);
            if('error' in body) {
                cb(body);
            } else {
                cb(null, body.access_token);
            }
        }
    });
}

// Auth requests
const validateRequest = exports.validateRequest = function(req, cb) {
    async.waterfall([
        // confirm the jwt is provided and valid
        function(cb) {
            var result = {};
            if (!req.headers['x-access-token']) {
                cb({status: '404', 'message':'Invalid credentials'});
                logger.warn(util.log(['u', 'lib/lib.auth', 'validateRequest',
                'Request missing x-access-token']));
            } else {
                validateJwt(req.headers['x-access-token'], function(err, encoded){
                    if (err) {
                        return cb({status: '500', message: 'Server error'}, result);
                    }

                    if(encoded){
                        result.encodedJwt = encoded;
                        cb(null, result);
                    } else {
                        cb({status: '401', message: 'Invalid credentials'});
                    }
                });
            }
        },
        // decode the jwt
        function(result, cb) {
            verifyJwt(result.encodedJwt, function(err, decoded) {
                if (err) {
                    return cb({status: '500', message: 'Server error'}, result);
                }

                if (decoded) {
                    result.userUuid = decoded.id;
                    cb(null, result);
                } else {
                    cb({status: '401', message: 'Invalid credentials'});
                }
            });
        },
        // get auth resources
        function(result, cb) {
            getAuthResources(result.userUuid, function(err, resources){
                if (err) {
                    return cb({status: '500', message: 'Server error'}, result);
                }

                if (resources) {
                    result.resources = resources;
                    cb(null, result);
                } else {
                    cb({status: '500', message: 'Server error'});
                }
            })
        }
    ],
    function(err, result) {
        if (err) {
            cb(err);
            logger.error(util.log(['s', 'lib/lib.auth', 'validateRequest',
                'Request failed validation', {userId: util.hide(result.userUuid)}]));
        } else {
            cb(null, result);
            logger.verbose(util.log(['s', 'lib/lib.auth', 'validateRequest',
                'Request validated', {userId: util.hide(result.userUuid)}]));
        }
    });
};

// Manage authorized resources 
const getAuthResources = exports.getAuthResources = function(userId, cb) {
    userModel.selectResources(conn, userId, function(err, resources) {
        if(err) {
            cb(err);
            logger.error(util.log(['s', 'lib/lib.auth', 'getAuthResources',
                'Resources select failed', {userId: util.hide(userId)}]));
        } else {
            if (resources) {
                cb(null, resources);
                logger.verbose(util.log(['s', 'lib/lib.auth', 'getAuthResources',
                    'Resources returned', {userId: util.hide(userId)}]));
            } else {
                cb(null);
                logger.warn(util.log(['s', 'lib/lib.auth', 'getAuthResources',
                    'Resources not found', {userId: util.hide(userId)}]));
            }
        }
    });
};

const validateResource = exports.validateResource = function(req, param, authDetails, cb) {
    async.waterfall([
        function(cb) {
            // do some regex validation
            const patt = new RegExp(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            const value = req.params[param];

            if(!patt.test(value)) {
                cb({status: '422', message: 'Invalid resource'});
                logger.error(util.log(['u', 'lib/lib.auth', 'validateResource',
                    'Resource failed validation', {value: util.hide(value)}]));
            } else {
                cb(null, value);
                logger.verbose(util.log(['u', 'lib/lib.auth', 'validateResource',
                    'Resource validated', {value: util.hide(value)}]));
            }
        },
        // confirm there are resources
        function(value, cb) {
            if (authDetails) {
                cb(null, value);
            } else {
                cb({status: '422', message: 'Invalid resource'});
                logger.error(util.log(['u', 'lib/lib.auth', 'validateResource',
                    'Resources not provided', {value: util.hide(value)}]));
            }
        },
        // confirm the integration is an authorized resource
        function(value, cb) {
            if(authDetails.resources.list.indexOf(value) < 0) {
                cb({status: '401', message: 'Not authorized to access resource'});
                logger.warn(util.log(['u', 'lib/lib.auth', 'validateResource',
                    'Resource not authorized', {value: util.hide(value)}]));
            } else {
                cb(null, value);
                logger.verbose(util.log(['u', 'lib/lib.auth', 'validateResource',
                    'Resource authorized', {value: util.hide(value)}]));
            }
        },
    ],
    function(err, value) {
        if (err) {
            return cb(err);
        }
        cb(null, value);
    });
};

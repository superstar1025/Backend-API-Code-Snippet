'use strict';
const async = require('async');

const logger = require('./lib.logger');
const util = require('./lib.util');

const validateObject = exports.validateObject = function(data, cb) {
    async.each(data, function(val,cb){
        async.waterfall([
            function(cb){
                if(val[1] != null) {
                    // the value must be an object
                    if(!(val[0] !== null && typeof val[0] === 'object')){
                        cb('value is not an object');
                        logger.error(util.log(['u', 'lib/lib.validate', 'validateObject',
                            'Value is not an object', {'value': val[0]}]));
                    }
                    // extract the path
                    var valPaths = val[1].split(".");
                    // validate each step exists
                    var current = val[0];
                    async.each(valPaths, function(valPath,cb){
                        if (!(valPath in current)) {
                            // if the value is optional, allow path validation to fail
                            if(val[3]) {
                                cb('optional');
                            } else {
                                cb(valPath + ' is invalid');
                                logger.error(util.log(['u', 'lib/lib.validate', 'validateObject',
                                    'Path validation failed', {'path': val[1]}]));
                            }
                        } else {
                            current = current[valPath];
                            cb();
                        }
                    }, function(err){
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, current, val[2]);
                            logger.verbose(util.log(['u', 'lib/lib.validate', 'validateObject',
                                'Path validation succeeded', {'path': val[1]}]));
                        }
                    });
                } else {
                    cb();
                }
            },
            function(value, regex, cb){
                util.regexMatch(value, regex, function(err, result) {
                    if (err) {
                        return cb(true);
                    }
                    if (!result) {
                        cb('Regex validation failed', false);
                        logger.warn(util.log(['u', 'lib/lib.validate', 'validateObject',
                            'Regex validation failed', {value: value, regex: regex.toString()}]));
                    } else {
                        cb(null, value);
                        logger.verbose(util.log(['u', 'lib/lib.validate', 'validateObject',
                            'Regex validation succeeded', {value: value}]));
                    }
                });
            }
        ], function(err, value){
            if (err) {
                // if err is false, it's because value is optional
                if(err === 'optional') {
                    cb();
                } else {
                    cb(err);
                }
            } else {
                cb();
            }
        });
    }, function(err, valPaths){
        if (err) {
            cb(err, false);
            logger.error(util.log(['u', 'lib/lib.validate', 'validateObject', 'Validation failed',
                {'error': err}]));
        } else {
            cb(null, true);
            logger.verbose(util.log(['u', 'lib/lib.validate', 'validateObject',
                'Validation succeeded']));
        }
    });

}

const validateSubId = exports.validateSubId = function(req, cb) {

    var data = [[req, 'user.sub', /^auth0\|[a-z0-9]{24}$/]];

    validateObject(data, function(err, result){
        if (err) {
            cb(true,false);
            logger.warn(util.log(['u', 'lib/lib.validate', 'validateSubId',
                'Sub failed validation']));
        } else {
            var subId = req.user.sub.split('|')[1];
            cb(null, subId);
            logger.verbose(util.log(['u', 'lib/lib.validate', 'validateSubId',
                'Sub validated', {sub: util.hide(subId)}]));
        }
    });

};
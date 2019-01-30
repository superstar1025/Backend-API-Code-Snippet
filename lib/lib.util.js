'use strict';

const async = require('async');

const friendlyTimeSince = exports.friendlyTimeSince = function(timestamp, cb) {

    var time = new Date(timestamp);
    var now = new Date();
    var diffMs = (now - time);
    var diffDays = Math.floor(diffMs / 86400000); // days
    var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // mins

    if (diffDays < 1 ) {
        if (diffHrs < 1) {
            if (diffMins < 2) {
                cb(null, 'just now');
            } else if (diffMins === 60) {
                cb(null, '1 hour ago');
            } else {
                cb(null, diffMins + ' minutes ago');
            }
        } else {
            if (time.getDay() != now.getDay()) {
                cb(null, 'yesterday') 
            } else {
                if (diffHrs === 1) {
                    cb(null, '1 hour ago');
                } else {
                    cb(null, diffHrs + ' hours ago');
                }
            }
        }
    } else if (diffDays === 1) {
        cb(null, 'yesterday');
    } else {
        var options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
        cb(null, time.toLocaleDateString("en-US", options));
    }

}

const regexMatch = exports.regexMatch = function(str, pattern, cb) {
    const regex = new RegExp(pattern);
    const n = regex.test(str);
    if (n > 0) {
        cb(null, true);
    } else {
        cb(null, false)
    }
}

const validateParam = exports.validateParam = function(param, cb) {
    if(typeof(param) !== 'object' || param === null) {
        cb(null, false);
    } else {
        if (Object.keys(param).length < 1) {
            cb(null, false);
        } else {
            cb(null, param);
        }
    }
}

const validateJson = exports.validateJson = function(str, cb) {

    if (typeof(str) === 'object'){
        return cb(str);
    }

    try {
        JSON.parse(str);
    } catch (e) {
        return cb(false);
    }
    return cb(JSON.parse(str));
}

exports.uuid = function(conn, cb) {
    const sql = 'SELECT UUID() as uuid';

    conn.query(sql, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]['uuid']);
    });
}

exports.hide = function(string) {
    if (typeof(string) !== 'string') {
        return 'Invalid type'
    }
    var len = string.length/2;
    if (len > 11) { 
        return string.substr(0,5) + '...' + string.substr(-5);
    } else if (len > 5) {
        return string.substr(0,3) + '...';
    } else if (len === 0) {
        return 'empty';
    } else {
        return 'XXXX';
    }
}

exports.log = function(details) {
    // [type, path name, function name, detail, meta]
    var t = '';
    if(details[0] === 'u') {
        t = 'user';
    } else if (details[0] === 's') {
        t = 'system';
    }

    return JSON.stringify({'t': t, 'p': details[1],
        'f': details[2], 'd': details[3],
        'm': details[4]});
}

exports.templateReplace = function(string, replace, cb) {

    async.eachOf(replace, function(value, term, cb) {
        string = string.replace('{{' + term + '}}', value);
        cb();
    }, function(err) {
        cb(null, string);
    });

}
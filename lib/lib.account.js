'use strict';

const async = require('async');

const env = require('./lib.env');
const conn = require('./lib.db');
const util = require('./lib.util');

const accountModel = require('./models/lib.model.account');

const getAccount = exports.getAccount = function(accountUuid, cb) {
    accountModel.select(conn, {uuid: accountUuid}, function(err, result) {
        if (err) {
            return cb(err);
        }

        if (result.length === 1) {
            cb(null, result[0]);
        } else {
            cb(null, false);
        }

    });
}

const getUser = exports.getUser = function(param, cb) {
    accountModel.selectUser(conn, param, function(err, result) {
        if (err) {
            return cb(err);
        }

        if (result.length === 1) {
            cb(null, result[0]);
        } else {
            cb(null, false);
        }

    });
}


const getAccountChainAddress = exports.getAccountChainAddress = function(param, cb) {
    accountModel.selectAccountChainAddress(conn, param, function(err, accountChainAddress) {
        if (err) {
            return cb(err);
        }

        return cb(null, accountChainAddress);
    });

};
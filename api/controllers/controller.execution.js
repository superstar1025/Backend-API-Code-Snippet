'use strict';

const async = require('async');

const auth = require('../../lib/lib.auth');
const execution = require('../../lib/lib.execution');
const conn = require('../../lib/lib.db');

const logger = require('../../lib/lib.logger');

const viewExecution = exports.viewExecution = function(req, res) {


    async.waterfall([
        function(cb) {
            auth.validateRequest(req, function(err, resources){
                if (err) {
                    return cb(err);
                }
                cb(null, resources);
            });
        },
        // confirm the integration_contract_clause is valid
        function(resources, cb) {
            auth.validateResource(req, 'executionUuid', resources, function(err, value) {
                if (err) {
                    return cb(err);
                }
                cb(null, value);
            });
        },
        // look up contract
        function(executionUuid, cb) {
            execution.getExecution(executionUuid, function(err, executionDetails) {
                if (err) {
                    return cb(err);
                }
                cb(null, executionDetails);
            });
        },
    ],
    function(err, executionDetails){
        if (err) {
            return res.status(err.status).send({'error': err.message});
        }
        res.send(executionDetails);

    });

}
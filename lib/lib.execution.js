'use strict'

const async = require('async');

const executionModel = require('./models/lib.model.execution');
const conn = require('./lib.db');

const getExecution = exports.getExecution = function(executionUuid, cb) {
    executionModel.selectContractClauseContractExecution(conn, {'uuid': executionUuid}, function(err, execution) {
        if (err) {
            return cb(err);
        }
        cb(null, execution);
    });
};

const getContractClauseContractExecution = exports.getContractClauseContractExecution = function(param, cb) {
    executionModel.selectContractClauseContractExecution(conn, param, function(err, execution) {
        if (err) {
            return cb(err);
        }
        cb(null, execution);
    });
};

const setContractClauseContractExecution = exports.setContractClauseContractExecution = function(param, cb) {
    executionModel.updateContractClauseContractExecution(conn, param, function(err, results){
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });
};

const createExecution = exports.createExecution = function(contract_id, contract_clause_id, cb) {
    
    executionModel.create(conn, contract_id, function(err, contractExecutionId) {
        cb(null, contractExecutionId);
    });

};
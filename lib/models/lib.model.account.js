'use strict'

const async = require('async');

const logger = require('../lib.logger');
const util = require('../lib.util');

const select = exports.select = function(conn, param, cb) {

    const sql = 
        'SELECT * \
        FROM account a \
        WHERE ?';

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results);
    });

}

const selectUser = exports.selectUser = function(conn, param, cb) {

    const sql = 
        'SELECT a.id, a.uuid, a.created\
        FROM account a \
        JOIN account_usr au ON a.id = au.account_id \
        JOIN usr u ON au.usr_id = u.id \
        WHERE ?';
        
    conn.query(sql, param, function(err, results, fields) {

        if (err) {
            cb(err, false);
        } else {
            cb(null, results);
            logger.debug(util.log(['s','lib/models/lib.model.account', 'selectuser',
                'Query account_usr', {'err': err, 'sql': sql, 'param': param,
                'fields': fields, 'results': results}]));
        }   

    });    
}

const selectAccountChainAddress = exports.selectAccountChainAddress = function(conn, param, cb) {

    const sql = 
        'SELECT DISTINCT ca.address, c.uuid as chain_uuid, c.name \
        FROM contract_clause_account_chain_address ccaca \
        JOIN contract_clause cc ON ccaca.contract_clause_id = cc.id \
        JOIN clause cl ON cc.clause_id = cl.id \
        JOIN account_chain_address aca ON ccaca.account_chain_address_id = aca.id \
        JOIN chain_address ca ON aca.chain_address_id = ca.id \
        JOIN chain c ON ca.chain_id = c.id \
        WHERE ?'

    conn.query(sql, param, function (err, results, fields) {
        if (err) {
            return cb(err);
        }
        cb(null, results[0]);
    });

}
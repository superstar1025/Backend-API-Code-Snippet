'use strict'
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const async = require('async');

const logger = require('./lib.logger');
const env = require('./lib.env');
const util = require('./lib.util');
const dateFormat = require('dateformat');

var mailer = nodemailer.createTransport(mg(env.comm.email));

const sendEmail = function(email, template, options, param, cb){

    // add year to param
    param.year = (new Date()).getFullYear();

    async.series([
        function(cb) {
            var filePath = path.join(__dirname, '/templates/email/' + template + '.html');
            var filePath = path.join(__dirname, '/templates/email/' + template + '.html');
            fs.exists(filePath, function(exists) {
                if (exists) {
                    fs.readFile(filePath, {encoding: 'utf-8'}, function(err, html){
                        if (err){
                            cb(err);
                        } else {
                            util.templateReplace(html, param, function(err, results) { 
                                if (err){
                                    cb(err);
                                } else {
                                    cb(null, results);
                                }
                            });
                        }
                    });
                } else {
                    cb('Template not found');
                }
            });
        },
        function(cb) {
            var filePath = path.join(__dirname, '/templates/email/' + template + '.txt');
            fs.exists(filePath, function(exists) {
                if (exists) {
                    fs.readFile(filePath, {encoding: 'utf-8'}, function(err, text){
                        if (err){
                            cb(err);
                        } else {
                            util.templateReplace(text, param, function(err, results) { 
                                if (err){
                                    cb(err);
                                } else {
                                    cb(null, results);
                                }
                            });
                        }
                    });
                } else {
                    cb('Template not found');
                }
            });
        }
    ],
    function(err, content) {
        if (err){
            cb(err);
            logger.error(util.log(['u', 'lib/lib.comm.email', 'sendPasswordResetEmail',
                'Email failed to send', {err: err}]));
        } else {

            var sendOptions = {
                from: env.comm.email.defaultFrom,
                to: options.to,
                subject: options.subject,
                html: content[0],
                text: content[1]
            };
            
            // don't wait for the email to send
            cb(null, true);

            mailer.sendMail(sendOptions, function(err, info) {
                if (err) {
                    logger.error(util.log(['u', 'lib/lib.comm.email', 'sendPasswordResetEmail',
                        'Email failed to send', {err: err, options: sendOptions}]));
                } else {
                    logger.verbose(util.log(['u', 'lib/lib.comm.email', 'sendPasswordResetEmail',
                        'Email sent', {info: info}]));
                }
            });
        }

    });
}

// email sent when a user requests a password reset
const sendPasswordResetRequestEmail = exports.sendPasswordResetRequestEmail = function(email, name, code, cb){

    const url = env.route.host + env.auth.passwordResetValidateUri + '?code=' + encodeURI(code);

    const param = {
        name: name,
        url: url
    }

    const options = {
        to: email,
        subject: '🔒 BlockTetris password reset requested'
    }

    sendEmail(email, 'template.email.passwordResetRequest', options, param, function(err, result) {
        if (err) {
            cb(err);
        } else {
            cb(null, result);
        }
    });

}
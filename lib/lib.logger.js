'use strict'

const winston = require('winston');
const env = require('./lib.env');

const logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: env.logger.level,
            colorize: true,
            timestamp: function () {
                return (new Date()).toISOString();
            }
        })
    ]
});

module.exports = logger;
'use strict';

const express = require('express');
const cors = require('cors')
const app = express();
const bodyParser = require('body-parser');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

const winston = require('winston');
const expressWinston = require('express-winston');
require('winston-loggly-bulk');
const logger = require('../lib/lib.logger');

const env = require('../lib/lib.env');
const util = require('../lib/lib.util');

if (env.logger.loggly) {
    logger.add(winston.transports.Loggly, env.logger.logglyOptions);
}

const port = env.apps.api.port;

app.use(cors());

app.use((err, req, res, next) => {
    if (err) {
        res.status(400).send({'error': 'Invalid request data'});
    } else {
        next();
    }
})

app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console({
              json: false,
              colorize: true,
              timestamp: true
        })
      ],
      level: function(req, res) { 
          if (res.statusCode > 399) {
              return 'warn';
          } else {
              return 'info';
          }
      },
      statusLevels: false,
      meta: false, // optional: control whether you want to log the meta data about the request (default to true)
      msg: "{\"t\":\"system\",\"p\":\"api/server\",\"f\":\"routes/route\",\"d\":\"Request\",\"m\":{\"method\":\"{{req.method}}\",\"url\":\"{{req.url}}\",\"statusCode\":\"{{res.statusCode}}\",\"responseTime\":\"{{res.responseTime}}ms\"}}",
      //msg: util.log(['s', 'api.server', '','Request', '{"method":\"{{req.method}}\", \"url\":\"{{req.url}}\", \"statusCode\":\"{{res.statusCode}}\", \"responseTime\":\"{{res.responseTime}}ms\"}']),
      expressFormat: false, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
      ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
    })
);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

const jwtCheck = jwt({
    secret: jwks.expressJwtSecret(env.auth.jwt.secret),
    aud: env.auth.jwt.aud,
    issuer: env.auth.jwt.issuer,
    algorithms: env.auth.jwt.algorithms
});

app.use(jwtCheck);

app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    logger.warn(util.log(['u', 'api/server', '','Invalid token', {token: util.hide(req.header('Authorization'))}]));
    res.status(401).send('Unauthorized');
  } else {
    logger.verbose(util.log(['u', 'api/server', '','Valid token', {token: util.hide(req.header('Authorization'))}]))
  }
});

var routes = require('./routes/v1/route');

routes(app);

app.listen(port);

logger.info(util.log(['s', 'api/server', '','Server started', {server: 'api', port: port}]));

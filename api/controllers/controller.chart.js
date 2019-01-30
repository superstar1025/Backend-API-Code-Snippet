'use strict';

const async = require('async');

const auth = require('../../lib/lib.auth');
const chart = require('../../lib/lib.chart');
const user = require('../../lib/lib.user');
const validate = require('../../lib/lib.validate');

exports.getChartData = function(req, res) {
    async.waterfall([
        // extract and validate the auth0 sub id from the token
        function(cb) {
            validate.validateSubId(req, function(err, subId) {
                if(err){
                    cb('Invalid sub id');
                    logger.error(util.log(['u', 'controllers/controller.message', 'getUserNotifications',
                    'SubId validation error', {'error': err}]));
                } else {
                    cb(null, subId)
                }
            });
        },
        // get the user id
        function(subId, cb) {
            user.getUser({'u.auth_id': subId}, function(err, userDetails){
                if(err){
                    cb(err);
                } else {
                    cb(null, userDetails.id);
                }
            });
        },
        // get chart data
        function(userId, cb){

            switch(req.url){
                case '/chart/integration/option/execution':
                    chart.integrationOptionExecutions(req.body, function(err, labels, data) {
                        if (err) {
                            cb(err);
                        } else {
                            var results = {labels: labels, data: data};
                            cb(null, results);
                        }
                    });
                    break;
                default:
                    cb('invalid route');
                    break;
            }
        }
    ], function(err, notifications) {
        if(err) {
            res.status('401').send('Unauthorized');
        } else {
            res.status('200').send(JSON.stringify(notifications));
        }
    });
};

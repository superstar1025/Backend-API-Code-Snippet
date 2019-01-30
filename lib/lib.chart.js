'use strict';

const async = require('async');
const logger = require('./lib.logger');
const util = require('./lib.util');

Date.prototype.addDays = function(days, options) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString("en-US", options);
}

exports.integrationOptionExecutions = function(integrationOption, cb) {

    if(!('execution' in integrationOption)) {
        cb('missing required param');
        logger.error(util.log(['s', 'lib/lib.chart', 'integrationOptionExecutions',
            'Chart integration option executions failed', {'error': 'missing required param'}]));
    } else {
        if (integrationOption.execution.length < 1) {
            console.log('YEP')
            return cb(null, null, null);
        }
        var options = { 
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        var oneDay = 24*60*60*1000;
        var firstDate = new Date("2017","00","01");
        async.waterfall([
            // unpack the executions
            function(cb) {
                var executions = [];
                async.each(integrationOption.execution, function(optionExecution, cb){
                    // convert the date into just days
                    var date = new Date(optionExecution.executed);
                    date = date.toLocaleDateString("en-US", options);
                    var secondDate = new Date(date);
                    var diffDays = Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
                    executions.push([diffDays, date]);
                    cb();
                });
                cb(null, executions);
            },
            // sort the list 
            function(executions, cb){
                executions.sort();
                var first = executions[0][0];
                var last = executions[executions.length - 1][0];
                cb(null, executions, first, last);
            },
            // count up executions per day
            function(executions, first, last, cb){
                var executionsCount = {};
                async.each(executions, function(execution, cb){
                    if(execution[0] in executionsCount) {
                        executionsCount[execution[0]] = [execution[1], executionsCount[execution[0]][1] + 1];
                    } else {
                        executionsCount[execution[0]] = [execution[1], 1];
                    }
                });
                cb(null, executionsCount, first, last);
            },
            // add 0 days
            function(executions, first, last, cb){
                // start from the first and increment by a day
                //console.log(executions)
                //console.log(first)
                //console.log(last)

                var current = first;

                var currentDate = new Date(firstDate);

                async.whilst(
                    function() { 
                        return current != last;
                    },
                    function(cb) {
                        // check if the current index exists in executions
                        if(!(current in executions)) {
                            // add the current number of days to the firstDate
                            executions[current] = [currentDate.addDays(current, options), 0];
                        }
                        current = current + 1;
                        cb(null, current)
                    },
                    function (err, n) {
                        cb(null, executions)
                    }
                );
            },
            // break into labels and data
            function(executions, cb){
                var data = [];
                var labels = [];
                async.each(executions, function(execution, cb){
                    labels.push(execution[0]);
                    data.push(execution[1]);
                });
                cb(null, labels, data);
            }
        ], function(err, labels, data){
            if (err) {
                cb(err);
            } else {
                cb(null, labels, data);
            }
        })
    }

}


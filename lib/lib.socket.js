const env = require('./lib.env');
const user = require('./lib.user');
const util = require('./lib.util');
const logger = require('./lib.logger');

const aws = require('aws-sdk');
aws.config.update(env.aws.creds);
const sqs = new aws.SQS({apiVersion: '2012-11-05'});

const sendSocket = exports.sendSocket = function(userId, messageId, body, cb) {

    user.getUser({'u.id': userId}, function(err, userDetails){

        var attributes = {
            'notification_uuid': {
                DataType: "String",
                StringValue: messageId.toString()
            },
            'user_uuid': { 
                DataType: "String",
                StringValue: userDetails.uuid
            }
        };

        var params = {
            DelaySeconds: 10,
            MessageAttributes: attributes,
            MessageBody: JSON.stringify(body),
            QueueUrl: env.aws.queues.socket.url
        };

        sqs.sendMessage(params, function(err, data) {
            if (err) {
                cb(err);
                logger.error(util.log(['s', 'lib/lib.socket', 'sendSocket',
                    'Socket failed to send', {'error': err, 'userId': userId, 'messageId': messageId, 'body': body}]));
            } else {
                cb(null, data.MessageId);
                logger.verbose(util.log(['s', 'lib/lib.socket', 'sendSocket',
                    'Socket sent', {'userId': userId, 'messageId': messageId, 'body': body}]));
            }
        });
    });
}
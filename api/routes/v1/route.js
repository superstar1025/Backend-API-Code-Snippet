'use strict';

module.exports = function(app) {

    const contractController = require('../../controllers/controller.contract');
    const chartController = require('../../controllers/controller.chart');
    const clauseController = require('../../controllers/controller.clause');
    const integrationController = require('../../controllers/controller.integration');
    const executionController = require('../../controllers/controller.execution');
    const userController = require('../../controllers/controller.user');
    const messageController = require('../../controllers/controller.message');
    const notificationController = require('../../controllers/controller.notification');
    const fixtureController = require('../../../test/helpers/controller.fixtures');
    const errorController = require('../../../test/helpers/controller.errors');

    // auth
    app.route('/auth-check/')
        .get(userController.authCheck);

    // contracts
    app.route('/contract/')
        .get(contractController.getContractUser);

    app.route('/contract/:contractUuid')
        .get(contractController.getContractUser);

    app.route('/contract/')
        .post(contractController.createContract);

    app.route('/contract/:contractUuid')
        .patch(contractController.setContract);

    app.route('/contract/:contractUuid')
        .delete(contractController.deleteContract);

    app.route('/contract/:contractUuid/clause')
        .get(clauseController.getContractClauses);

    app.route('/contract/:contractUuid/clause/:contractClauseUuid')
        .get(clauseController.getContractClause);

    app.route('/contract/:contractUuid/clause/:clauseUuid/address')
        .get(clauseController.getContractClauseAddress);

    app.route('/contract/:contractUuid/clause/:clauseUuid/integration')
        .get(clauseController.getContractClauseIntegration);

    app.route('/contract/:contractUuid/clause/:clauseUuid')
        .post(clauseController.createContractClause);

    app.route('/contract/:contractUuid/clause/:contractClauseUuid')
        .delete(clauseController.deleteContractClause);

    app.route('/contract/:contractUuid/clause/:clauseUuid')
        .patch(clauseController.setContractClause);

    // integration
    app.route('/integration/:integrationUuid')    
        .post(integrationController.createAccountIntegration);

    app.route('/integration/:integrationClauseUuid/option')    
        .get(integrationController.getAccountIntegrationOptions);

    app.route('/integration/:integrationUuid/option/:integrationOptionUuid')    
        .get(integrationController.getAccountIntegrationOption);

    app.route('/integration/:integrationUuid/option/:integrationOptionUuid')    
        .patch(integrationController.setAccountIntegrationOption);

    app.route('/integration/:integrationUuid/option/:integrationOptionUuid')    
        .delete(integrationController.deleteAccountIntegrationOption);

    app.route('/integration/:integrationUuid/option/:integrationOptionUuid')    
        .delete(integrationController.getAccountIntegrationOption);

    app.route('/contract/:contractUuid/clause/:contractClauseUuid/integration/:contractClauseIntegrationUuid')
        .delete(clauseController.deleteContractClauseIntegration);

    // execution
    app.route('/execution/:executionUuid')
        .get(executionController.viewExecution);

    // users
    app.route('/user/')
        .get(userController.getUser);

    app.route('/user/')
        .patch(userController.setUser);

    app.route('/user/')
        .delete(userController.deleteUser);

    // messages
    app.route('/message/')
        .get(messageController.getUserMessages);

    app.route('/message/:messageUuid')
        .get(messageController.getUserMessages);

    app.route('/message/:messageUuid')
        .patch(messageController.setUserMessage);

    app.route('/message/:messageUuid')
        .delete(messageController.deleteUserMessage);

    app.route('/message/')
        .post(messageController.createUserMessage);

    // notifications
    app.route('/notification/')
        .get(notificationController.getUserNotifications);

    app.route('/notification/')
        .patch(notificationController.setUserNotifications);

    app.route('/notification/')
        .post(notificationController.createUserNotification);

    // charts
    app.route('/chart/integration/option/execution/')
        .post(chartController.getChartData);

    // fixtures
    app.route('/fixture/')
        .post(fixtureController.loadFixtures);

    // errors
    app.route('/error/:statusCode')
        .get(errorController.returnError);

};
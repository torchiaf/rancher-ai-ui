/**
 * Deletes all chat history for the logged-in user.
 *
 * @return void
 */
Cypress.Commands.add('cleanChatHistory', () => {
  return cy.getCookie('CSRF').then((token) => {
    cy.request({
      method:  'DELETE',
      url:     `${ Cypress.env('chatServiceProxyPath') }/chats`,
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
    })
      .then((resp) => {
        expect(resp.status).to.eq(204);
      });
  });
});

/**
 * Enable or disable the DB supervisor via Helm chart configuration.
 *
 * The command re-deploys the Rancher AI services with the DB supervisor enabled or disabled. When the supervisor
 * is enabled, chat history is stored in the database.
 *
 * It's RECOMMENDED to use this command in a `before` and `after` hook to ensure the desired state for the tests outside history context.
 *
 * The reason why we need to enable/disable the DB supervisor is:
 *
 *   When enabled, it calls the ws/summary websocket endpoint to assign the name to the non-active chats (history chats).
 *   The summary requests can consume the llm-mock service responses from the queue in a random interval,
 *   causing tests to fail due to unexpected responses.
 *
 * @param value - true to enable, false to disable
 * @return void
 */
Cypress.Commands.add('chatHistoryEnabled', (value: boolean) => {
  return cy.getCookie('CSRF').then((token) => {
    cy.request({
      method:  'POST',
      url:     '/v3/clusters/local?action=generateKubeconfig',
      headers: {
        'x-api-csrf': token.value,
        Accept:       'application/json'
      },
    }).then((resp) => {
      expect(resp.status).to.eq(200);

      const chart = Cypress.env('helmChartDir');
      const kubeconfig = `${ Cypress.config('downloadsFolder') }/local.yaml`;

      cy.writeFile(kubeconfig, resp.body.config);

      const enable = value ? 'true' : 'false';
      const cmd = `.github/scripts/enable-rancher-ai-chat-history.sh ${ kubeconfig } ${ chart } ${ enable }`;

      cy.exec(cmd, {
        failOnNonZeroExit: false,
        timeout:           120000
      }).then((result) => {
        cy.log(`Script output: ${ result.stdout || 'None' }`);
        cy.log(`Script error: ${ result.stderr || 'None' }`);

        expect(result.code).to.eq(0);
      });
    });
  });
});
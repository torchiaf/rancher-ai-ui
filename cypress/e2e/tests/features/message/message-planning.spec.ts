import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Message Planning', () => {
  const chat = new ChatPo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
  });

  describe('Planning with approval', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
      cy.clearLLMResponses();
      cy.updateAiAssistantConfigs({
        PLAN_ENABLED:          'true',
        PLAN_APPROVAL_ENABLED: 'true'
      });
    });

    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();
    });

    it('Execution succeeds', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueuePlanningResponse([
        {
          label:  'Create a new namespace in the cluster \'local\'.',
          agent:  'rancher',
          result: {
            status:  'completed',
            message: 'Namespace created'
          }
        },
        {
          label:  'Create a pod inside the newly created namespace in cluster \'local\'.',
          agent:  'fleet',
          result: {
            status:  'completed',
            message: 'Pod created'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.approve();

      planningMessage.cancelButton().should('be.visible');

      planningMessage.header().contains('All tasks have been completed');
      planningMessage.status().contains('Completed');

      planningMessage.cancelButton().should('not.exist');
    });

    it('Execution fails', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueuePlanningResponse([
        {
          label:  'Create a new namespace in the cluster \'local\'.',
          agent:  'rancher',
          result: {
            status:  'completed',
            message: 'Namespace created'
          }
        },
        {
          label:  'Create a pod inside the newly created namespace in cluster \'local\'.',
          agent:  'fleet',
          result: {
            status:  'failed',
            message: 'Failed to create Pod'
          }
        }
      ]);

      chat.sendMessage('Create a namespace and a Pod in it');

      const planningMessage = chat.getMessage(3).planning();

      planningMessage.header().contains('Awaiting approval to execute the following tasks');

      planningMessage.item(0).label().contains('Create a new namespace in the cluster \'local\'.');
      planningMessage.item(0).agent().contains('Rancher');
      planningMessage.item(1).label().contains('Create a pod inside the newly created namespace in cluster \'local\'.');
      planningMessage.item(1).agent().contains('Continuous Delivery');

      planningMessage.approve();

      planningMessage.cancelButton().should('be.visible');

      planningMessage.header().contains('Execution has been stopped');
      planningMessage.status().contains('Execution failed');

      planningMessage.cancelButton().should('not.exist');
    });

    afterEach(() => {
      cy.clearLLMResponses();
    });
  });

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
    cy.updateAiAssistantConfigs({
      PLAN_ENABLED:          'false',
      PLAN_APPROVAL_ENABLED: 'false'
    });
  });
});

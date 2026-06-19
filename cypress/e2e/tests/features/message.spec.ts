import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import { WorkloadsDeploymentsDetailsPagePo, WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Messages', () => {
  const chat = new ChatPo();

  before(() => {
    cy.login();
    cy.installUIToolsDefinition();
    cy.clearLLMResponses();
  });

  beforeEach(() => {
    cy.login();

    HomePagePo.goTo();
  });

  it('Show list of resources', () => {
    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    cy.enqueueLLMResponse({
      text:           ['Here', ' are the resources', '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'],
    });

    chat.sendMessage('Show me the deployments in cattle-ai-agent-system namespace');


    cy.wait(1000000);
    const userMessage = chat.getMessage(2);

    userMessage.scrollIntoView();
    userMessage.containsText('Show me the deployments in cattle-ai-agent-system namespace');

    const resourceMessage = chat.getMessage(3);

    resourceMessage.scrollIntoView();
    resourceMessage.containsText('Here are the resources');

    const deployments = [
      'llm-mock',
      'rancher-ai-agent',
      'rancher-mcp-server',
    ];

    deployments.forEach((name) => {
      const btn = resourceMessage.resourceButton({ name });

      btn.should('exist');
      btn.click();

      const deployment = new WorkloadsDeploymentsDetailsPagePo(name, 'local', 'apps.deployment' as any, 'cattle-ai-agent-system');

      deployment.waitForPage();
    });
  });

  

  after(() => {
    cy.clearLLMResponses();
    cy.uninstallUIToolsDefinition();
  });
});

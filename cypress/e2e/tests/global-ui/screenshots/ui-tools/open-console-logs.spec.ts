import { NamespaceFilterPo } from '@rancher/cypress/e2e/po/components/namespace-filter.po';
import { WorkloadsDeploymentsDetailsPagePo, WorkloadsDeploymentsListPagePo } from '@rancher/cypress/e2e/po/pages/explorer/workloads/workloads-deployments.po';
import { getSpecName, moveMouseAway } from '@/cypress/e2e/utils';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

const name = getSpecName();

describe(`UI tool: ${ name }`, () => {
  const namespaceFilter = new NamespaceFilterPo();
  const deploymentsListPage = new WorkloadsDeploymentsListPagePo('local');
  const chat = new ChatPo();

  it('recording timestamp', () => {
    cy.setFullScreen();

    cy.login();

    HomePagePo.goTo();

    // Navigate to deployments page to get the pod name
    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    cy.wait(200);

    namespaceFilter.toggle();
    namespaceFilter.clickOptionByLabel('cattle-ai-agent-system');
    namespaceFilter.closeDropdown();

    cy.wait(200);

    deploymentsListPage.goToDetailsPage('llm-mock');

    const deploymentDetailsPage = new WorkloadsDeploymentsDetailsPagePo('llm-mock', 'local', 'apps.deployment' as any, 'cattle-ai-agent-system');

    deploymentDetailsPage.waitForPage();

    // Get the pod name from pods table
    cy.get('[data-testid="sortable-cell-0-1"] a').first().invoke('text').then((text) => {
      const podName = text.trim();

      HomePagePo.goTo();

      chat.open();

      moveMouseAway();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.checkExists();

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      ['Click the button below to check the logs of ', podName, ' pod.'],
        uiTools:   [
          {
            name: 'open-console-logs',
            args: {
              cluster:       'local',
              namespace:     'cattle-ai-agent-system',
              name:          podName,
              containerName: 'llm-mock',
            }
          }
        ]
      });

      chat.sendMessage(`Hi Liz! Show me the logs of ${ podName } pod`);

      const userMessage = chat.getMessage(2);

      userMessage.containsText(`Hi Liz! Show me the logs of ${ podName } pod`);

      const resultMessage = chat.getMessage(3);

      resultMessage.scrollIntoView().should('be.visible');

      cy.wait(500);

      const openConsoleTool = resultMessage.tool().openConsoleLogs('local', 'cattle-ai-agent-system', podName, 'llm-mock');

      openConsoleTool.scrollIntoView().should('be.visible');

      cy.wait(500);

      cy.recordTimestampStart(name);

      cy.wait(500);

      openConsoleTool.realHover();

      cy.wait(500);

      openConsoleTool.realClick();

      moveMouseAway();

      cy.wait(1500);

      cy.recordTimestampEnd(name);

      cy.wait(2000);
    });
  });

  after(() => {
    deploymentsListPage.goTo();
    deploymentsListPage.waitForPage();

    namespaceFilter.toggle();
    namespaceFilter.clickOptionByLabel('Only User Namespaces');
    namespaceFilter.closeDropdown();
  });
});

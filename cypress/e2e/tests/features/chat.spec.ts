import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ClusterDashboardPagePo from '@rancher/cypress/e2e/po/pages/explorer/cluster-dashboard.po';
import ClusterManagerListPagePo from '@rancher/cypress/e2e/po/pages/cluster-manager/cluster-manager-list.po';
import { FleetDashboardListPagePo } from '@rancher/cypress/e2e/po/pages/fleet/fleet-dashboard.po';
import UsersPo from '@rancher/cypress/e2e/po/pages/users-and-auth/users.po';
import ExtensionsPagePo from '@rancher/cypress/e2e/po/pages/extensions.po';
import { SettingsPagePo } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('Chat', () => {
  const chat = new ChatPo();

  beforeEach(() => {
    cy.login();
  });

  describe('Chat is available in main UI areas', () => {
    it('Home', () => {
      HomePagePo.goTo();

      chat.open();
      chat.close();
    });

    it('Cluster dashboard', () => {
      const localClusterDashboard = new ClusterDashboardPagePo('local');

      localClusterDashboard.goTo();

      chat.open();
      chat.close();
    });

    it('Cluster management', () => {
      const clusterList = new ClusterManagerListPagePo();

      clusterList.goTo();
      clusterList.waitForPage();

      chat.open();
      chat.close();
    });

    it('Fleet', () => {
      const fleetDashboardPage = new FleetDashboardListPagePo('_');

      fleetDashboardPage.goTo();
      fleetDashboardPage.waitForPage();

      chat.open();
      chat.close();
    });

    it('Users', () => {
      const usersPo = new UsersPo();

      usersPo.goTo();
      usersPo.waitForPage();

      chat.open();
      chat.close();
    });

    it('Extensions', () => {
      const extensionsPo = new ExtensionsPagePo();

      extensionsPo.goTo();
      extensionsPo.waitForPage();

      chat.open();
      chat.close();
    });

    it('Settings', () => {
      const settingsPage = new SettingsPagePo('_');

      settingsPage.goTo();
      settingsPage.waitForPage();

      chat.open();
      chat.close();
    });
  });

  describe('Messages', () => {
    beforeEach(() => {
      cy.login();
      cy.clearLLMResponses();

      HomePagePo.goTo();
    });

    it('Show Welcome message', () => {
      cy.enqueueLLMResponse({
        text:      'Providing mock response from the agent, containing suggestions for the welcome message. <suggestion>View resources</suggestion><suggestion>Analyze logs</suggestion><suggestion>Do action</suggestion>',
        chunkSize: 30
      });

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.containsText("I'm Liz, your personal AI assistant. How can I help you?");

      const suggestions = ['View resources', 'Analyze logs', 'Do action'];

      suggestions.forEach((value, index) => {
        welcomeMessage.suggestion(index).should('contain.text', value);
      });
    });

    it('Show list of resources', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      ['Here', ' are the resources'],
        tool: {
          name: 'listKubernetesResources',
          args: {
            kind:      'Pod',
            cluster:   'local',
            namespace: 'cattle-ai-agent-system'
          }
        },
      });

      chat.sendMessage('Show me the pods in cattle-ai-agent-system namespace');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Show me the pods in cattle-ai-agent-system namespace');

      const resourceMessage = chat.getMessage(3);

      resourceMessage.containsText('Here are the resources');
      resourceMessage.resourceButton('llm-mock').should('exist');
      resourceMessage.resourceButton('rancher-ai-agent').should('exist');
      resourceMessage.resourceButton('rancher-mcp').should('exist');
    });

    it('Confirm resource creation action', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:      'Pod created successfully.',
        tool: {
          name: 'createKubernetesResource',
          args: {
            kind:      'Pod',
            name:      'my-pod',
            resource:  {},
            cluster:   'local',
            namespace: 'default'
          }
        },
      });

      chat.sendMessage('Create a pod named my-pod in default namespace');

      const userMessage = chat.getMessage(2);

      userMessage.containsText('Create a pod named my-pod in default namespace');

      const confirmationRequestMessage = chat.getMessage(3);

      confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
      confirmationRequestMessage.confirmationButton().should('exist').click();
      confirmationRequestMessage.isConfirmed().should('exist');
      confirmationRequestMessage.containsText('Confirmed');

      const resultMessage = chat.getMessage(4);

      resultMessage.containsText('Pod created successfully.');
    });
  });
});

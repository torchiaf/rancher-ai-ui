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

  describe('Verify chat availability in different UI areas', () => {
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

      const welcomeMessage = chat.getTemplateMessage('welcome');

      welcomeMessage.should('exist');

      welcomeMessage.within(() => {
        cy.contains("I'm Liz, your personal AI assistant. How can I help you?").should('be.visible');

        const suggestions = ['View resources', 'Analyze logs', 'Do action'];

        suggestions.forEach((s) => {
          cy.contains(s, { timeout: 5000 }).should('be.visible');
        });
      });
    });

    it('Show list of resources', () => {
      chat.open();

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

      chat.getMessage(1).within(() => {
        cy.contains('Show me the pods in cattle-ai-agent-system namespace').should('be.visible');
      });

      chat.getMessage(2).within(() => {
        cy.contains('Here').should('be.visible');
        cy.contains('are the resources').should('be.visible');

        cy.get('[data-testid^="rancher-ai-ui-chat-message-action-button-llm-mock"]').should('exist');
        cy.get('[data-testid^="rancher-ai-ui-chat-message-action-button-rancher-ai-agent"]').should('exist');
        cy.get('[data-testid^="rancher-ai-ui-chat-message-action-button-rancher-mcp"]').should('exist');
      });
    });

    it('Confirm resource creation action', () => {
      chat.open();

      cy.enqueueLLMResponse({
        text:      'Confirmed',
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

      chat.getMessage(1).within(() => {
        cy.contains('Create a pod named my-pod in default namespace').should('be.visible');
      });

      chat.getMessage(2).within(() => {
        cy.contains('Are you sure you want to proceed with this action?').should('be.visible');
        cy.get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirm-button"]').should('exist').click();
      });

      chat.getMessage(2).within(() => {
        cy.contains('Confirmed').should('be.visible');
        cy.get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirmed"]').should('exist');
      });
    });
  });
});

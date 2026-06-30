import ProductNavPo from '@rancher/cypress/e2e/po/side-bars/product-side-nav.po';
import { SettingsPagePo as GlobalSettings } from '@rancher/cypress/e2e/po/pages/global-settings/settings.po';
import { SettingsPagePo } from '@/cypress/e2e/po/settings.po';
import ApplySettingsPromptPo from '@/cypress/e2e/po/dialog/apply-settings.po';

describe('AI Assistant Configuration', () => {
  const settingsPage = new SettingsPagePo();
  const apiPath = `/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-agent:80/proxy/v1/api`;

  const initValues = {
    llm:          'ollama',
    apiKey:       'empty',
    fleetAgent:   'fleet',
    rancherAgent: 'rancher', // default built-in agent
  };

  const updatedValues = {
    llm:               'gemini',
    apiKey:            'my-api-key',
    customAgentPrefix: 'agent-4-'
  };

  beforeEach(() => {
    cy.login();
  });

  it('Should show settings page', () => {
    const globalSettings = new GlobalSettings('_');

    globalSettings.goTo();
    globalSettings.waitForPage();

    const sideNav = new ProductNavPo();

    sideNav.navToSideMenuEntryByLabel('AI Assistant');

    cy.contains('AI Assistant Configuration').should('be.visible');
  });

  describe('AI Provider section', () => {
    beforeEach(() => {
      settingsPage.goTo();
      settingsPage.waitForPage();
    });

    it('It should correctly handle the AI Assistant settings', () => {
      const aiAgentSettings = settingsPage.settings().aiAgentSettings();

      aiAgentSettings.checkExists();

      aiAgentSettings.llm(initValues.llm).isSelected();

      aiAgentSettings.llm(updatedValues.llm).select();
      aiAgentSettings.llm(updatedValues.llm).isSelected();

      aiAgentSettings.apiKeyInput().parent().find('.hide-show').click();
      aiAgentSettings.apiKeyInput().should('have.value', initValues.apiKey);

      aiAgentSettings.apiKeyInput().clear().type(updatedValues.apiKey);

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      settingsPage.settings().saveButton().should('contain.text', 'Saved');

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentSettings.llm(updatedValues.llm).isSelected();

      aiAgentSettings.apiKeyInput().parent().find('.hide-show').click();
      aiAgentSettings.apiKeyInput().should('have.value', updatedValues.apiKey);

      // Revert changes
      aiAgentSettings.apiKeyInput().clear().type(initValues.apiKey);
      aiAgentSettings.llm(initValues.llm).select();

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      settingsPage.settings().saveButton().should('contain.text', 'Saved');
    });
  });

  describe('AI Agents section', () => {
    beforeEach(() => {
      settingsPage.goTo();
      settingsPage.waitForPage();
    });

    it('It should correctly show the AI Agents', () => {
      const aiAgentConfigs = settingsPage.settings().aiAgentConfigs();

      aiAgentConfigs.checkExists();

      // Check that Rancher Agent tab is shown
      aiAgentConfigs.tabs().getTab(initValues.rancherAgent).checkExists();

      // Check that multiple agents info message is shown
      aiAgentConfigs.self().should('contain', 'Because you have multiple AI agents enabled, you will be able to choose between “Adaptive Mode”');

      // Check that Rancher Agent is enabled and locked (it is a built-in agent)
      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid="${ initValues.rancherAgent }"]`);
      aiAgentConfigs.self().should('contain', 'This AI agent is locked');
    });

    it('It should correctly add new AI Agent', () => {
      const aiAgentConfigs = settingsPage.settings().aiAgentConfigs();

      // Add a custom AI Agent
      aiAgentConfigs.tabs().addTab();

      aiAgentConfigs.tabs().getTabByPrefix(updatedValues.customAgentPrefix).checkExists();

      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid^="${ updatedValues.customAgentPrefix }"]`);
      aiAgentConfigs.self().should('not.contain', 'This AI agent is locked');

      // Check that Save button is disabled since the new agent has validation errors -> missing MCP URL
      settingsPage.settings().saveButton().should('be.disabled');

      // Fill the required fields for the custom agent and check that the Save button is enabled
      aiAgentConfigs.mcpUrlInput().set('http://my-mcp-url:8080');
      aiAgentConfigs.descriptionInput().type('Custom agent description');
      aiAgentConfigs.guidelinesInput().type('Custom agent guidelines');

      settingsPage.settings().saveButton().should('be.enabled');

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      settingsPage.settings().saveButton().should('contain.text', 'Saved');

      // Check that the new agent tab is showing error status due to invalid MCP URL
      aiAgentConfigs.tabs().assertTabHasLabelIcon(`[data-testid^="${ updatedValues.customAgentPrefix }"]`, 'icon-error');

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid^="${ updatedValues.customAgentPrefix }"]`);
      aiAgentConfigs.mcpUrlInput().value().should('eq', 'http://my-mcp-url:8080');

      // Check that the new agent tab is showing error status due to invalid MCP URL
      aiAgentConfigs.tabs().assertTabHasLabelIcon(`[data-testid^="${ updatedValues.customAgentPrefix }"]`, 'icon-error');
    });

    it('It should correctly remove an existing AI Agent', () => {
      const aiAgentConfigs = settingsPage.settings().aiAgentConfigs();

      // Remove the custom AI Agent
      aiAgentConfigs.tabs().removeTab();

      aiAgentConfigs.tabs().getTabByPrefix(updatedValues.customAgentPrefix).checkNotExists();

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      settingsPage.settings().saveButton().should('contain.text', 'Saved');

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentConfigs.tabs().getTabByPrefix(updatedValues.customAgentPrefix).checkNotExists();
      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid="${ initValues.rancherAgent }"]`);
    });

    it('It should correctly handle OAuth2 authentication', () => {
      const aiAgentConfigs = settingsPage.settings().aiAgentConfigs();

      // Add a custom AI Agent
      aiAgentConfigs.tabs().addTab();

      aiAgentConfigs.tabs().getTabByPrefix(updatedValues.customAgentPrefix).checkExists();

      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid^="${ updatedValues.customAgentPrefix }"]`);

      settingsPage.settings().saveButton().should('be.disabled');

      aiAgentConfigs.mcpUrlInput().set('http://my-mcp-url:8080');

      // Fill the required fields for OAuth2 authentication
      aiAgentConfigs.authenticationTypeSelector().toggle();
      aiAgentConfigs.authenticationTypeSelector().clickOptionWithLabel('OAuth2 authentication');

      settingsPage.settings().saveButton().should('be.disabled');

      cy.intercept('GET', `${ apiPath }/oauth2/metadata?*`, {
        statusCode: 200,
        body:       {
          metadataEndpoint: 'http://my-metadata-endpoint:8080',
          scopesSupported:  ['scope1', 'scope2']
        }
      }).as('metadataDiscovery');

      aiAgentConfigs.metadataDiscoveryButton().click();

      cy.wait('@metadataDiscovery');

      aiAgentConfigs.metadataEndpointInput().value().should('eq', 'http://my-metadata-endpoint:8080');

      settingsPage.settings().saveButton().should('be.disabled');

      aiAgentConfigs.scopesSelector().toggle();
      aiAgentConfigs.scopesSelector().clickOptionWithLabel('scope1');

      cy.intercept('POST', `${ apiPath }/oauth2/dynamic-registration`, {
        statusCode: 200,
        body:       {
          clientId:     'my-client-id',
          clientSecret: 'my-client-secret',
        }
      }).as('clientInfoDiscovery');

      aiAgentConfigs.clientInfoDiscoveryButton().click();

      aiAgentConfigs.clientIdInput().value().should('eq', 'my-client-id');
      aiAgentConfigs.clientSecretInput().value().should('eq', 'my-client-secret');

      settingsPage.settings().saveButton().should('be.disabled');

      cy.wait('@clientInfoDiscovery');

      aiAgentConfigs.descriptionInput().type('Custom agent description');
      aiAgentConfigs.guidelinesInput().type('Custom agent guidelines');

      settingsPage.settings().saveButton().should('be.enabled');

      settingsPage.settings().saveButton().click();

      new ApplySettingsPromptPo().confirm();

      settingsPage.settings().saveButton().should('contain.text', 'Saved');

      cy.intercept('GET', `${ apiPath }/oauth2/metadata?*`, {
        statusCode: 200,
        body:       {
          metadataEndpoint: 'http://my-metadata-endpoint:8080',
          scopesSupported:  ['scope1', 'scope2']
        }
      }).as('metadataDiscovery');

      // Revisit the page to check if the settings were saved correctly
      settingsPage.goTo();
      settingsPage.waitForPage();

      aiAgentConfigs.tabs().assertTabIsActive(`[data-testid^="${ updatedValues.customAgentPrefix }"]`);
      aiAgentConfigs.mcpUrlInput().value().should('eq', 'http://my-mcp-url:8080');
      aiAgentConfigs.authenticationTypeSelector().self().should('contain.text', 'OAuth2 authentication');

      // Wait for the metadata init fetch to populate the scopes
      cy.wait('@metadataDiscovery');

      aiAgentConfigs.metadataEndpointInput().self().scrollIntoView();
      aiAgentConfigs.metadataEndpointInput().value().should('eq', 'http://my-metadata-endpoint:8080');
      aiAgentConfigs.self().should('contain.text', 'scope1');
      aiAgentConfigs.clientIdInput().value().should('eq', 'my-client-id');
      aiAgentConfigs.clientSecretInput().value().should('eq', 'my-client-secret');
    });
  });

  after(() => {
    cy.installRancherAIService();
  });
});

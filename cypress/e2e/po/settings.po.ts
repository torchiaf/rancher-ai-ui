import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import PagePo from '@rancher/cypress/e2e/po/pages/page.po';
import { ToggleGroupPO } from './components/toggle-group.po';
import TabbedPo from './components/tabbed.po';
import CheckboxInputPo from '@rancher/cypress/e2e/po/components/checkbox-input.po';
import LabeledInputPo from '@rancher/cypress/e2e/po/components/labeled-input.po';

export class SettingsPagePO extends PagePo {
  private static createPath() {
    return `/c/local/settings/rancher-ai-ui`;
  }

  constructor() {
    super(SettingsPagePO.createPath());
  }

  settings() {
    return new SettingsPO(this.self());
  }
}

export class SettingsPO extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-container"]', self);
  }

  aiAgentSettings() {
    return new AiAgentSettings(this.self());
  }

  aiAgentConfigs() {
    return new AiAgentConfigs(this.self());
  }

  saveButton() {
    return this.self().get('[data-testid="rancher-ai-ui-settings-save-button"]');
  }
}

export class AiAgentSettings extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-ai-agent-settings"]', self);
  }

  llm(llmName: string) {
    return new ToggleGroupPO().toggleOption(llmName);
  }

  apiKeyInput() {
    return this.self().get('[data-testid="rancher-ai-ui-settings-llm-api-key-input"]').find('input');
  }
}

export class AiAgentConfigs extends ComponentPo {
  constructor(self: Cypress.Chainable) {
    super('[data-testid="rancher-ai-ui-settings-ai-agent-configs"]', self);
  }

  tabs() {
    return new TabbedPo('[data-testid="tabbed-block"]');
  }

  enableAgent() {
    return CheckboxInputPo.byLabel(this.self(), 'Enable this agent');
  }

  mcpUrlInput() {
    return LabeledInputPo.byLabel(this.self(), 'Endpoint');
  }
}
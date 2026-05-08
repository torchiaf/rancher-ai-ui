import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class ApplySettingsPromptPo extends ComponentPo {
  constructor() {
    super(cy.get('[data-testid="card"].prompt-apply-settings'));
  }

  applyButton() {
    return this.self().getId('prompt-apply-settings-confirm-button');
  }

  confirm() {
    return this.applyButton().click();
  }
}
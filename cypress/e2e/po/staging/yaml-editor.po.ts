import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class YamlEditorPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-staging-yaml-editor"]');
  }

  title() {
    return this.self().get('[data-testid="rancher-ai-ui-staging-yaml-editor"] .staging-yaml-title');
  }

  content() {
    return this.self().get('[data-testid="rancher-ai-ui-staging-yaml-editor-code-mirror-editor"]');
  }

  closeButton() {
    return this.self().get('[data-testid="rancher-ai-ui-staging-yaml-editor-close-button"]');
  }

  cancelButton() {
    return this.self().get('[data-testid="rancher-ai-ui-staging-yaml-editor-cancel-button"]');
  }

  confirmButton() {
    return this.self().get('[data-testid="rancher-ai-ui-staging-yaml-editor-apply-button"]');
  }

  confirm() {
    this.confirmButton().click();
  }

  cancel() {
    this.cancelButton().click();
  }

  close() {
    this.closeButton().click();
  }
}

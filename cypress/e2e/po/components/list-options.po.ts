import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class ListOptionsPo extends ComponentPo {
  constructor(index: number) {
    super(`[data-testid="rancher-ai-ui-chat-message-list-options-${ index }"]`);
  }

  label() {
    return this.self().find('.button-group-label');
  }

  editButton() {
    return this.self().find('.button-group-action');
  }

  select() {
    this.label().click({ force: true });
  }

  edit() {
    this.editButton().click({ force: true });
  }
}
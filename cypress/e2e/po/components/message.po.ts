import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class MessagePo extends ComponentPo {
  private id: string;

  constructor(id: string) {
    super(`[data-testid="rancher-ai-ui-chat-message-box-${ id }"]`);
    this.id = id;
  }

  isCompleted() {
    return this.self().get(`[data-teststatus="rancher-ai-ui-chat-message-status-${ this.id }-completed"]`).should('exist');
  }

  containsText(value: string) {
    return this.self().within(() => {
      cy.contains(value).should('be.visible');
    });
  }

  suggestion(index: number) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-suggestion-${ index }"]`);
  }

  resourceButton(resourceIdPrefix: string) {
    return this.self().get(`[data-testid^="rancher-ai-ui-chat-message-action-button-${ resourceIdPrefix }"]`);
  }

  confirmationButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirm-button"]');
  }

  isConfirmed() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-message-confirmation-confirmed"]');
  }
}
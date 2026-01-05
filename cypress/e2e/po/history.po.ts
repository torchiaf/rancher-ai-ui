import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

export class HistoryChatItemMenuActionPo extends ComponentPo {
  constructor(actionId: string) {
    super(`[data-testid="rancher-ai-ui-chat-history-chat-item-menu-button-option-${ actionId }"]`);
  }

  doAction() {
    this.self().click({ force: true });
  }
}

export class HistoryChatItemMenuPo extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-chat-history-chat-item-menu-button"]');
  }

  open() {
    this.self().realMouseUp();
    this.self().realClick();
  }

  doAction(actionId: string) {
    this.open();

    new HistoryChatItemMenuActionPo(actionId).doAction();
  }
}

export class HistoryChatItemPo extends ComponentPo {
  constructor(index: number) {
    super(`[data-testid="rancher-ai-ui-chat-history-chat-item-${ index }"]`);
  }

  menu() {
    this.self().realMouseUp();

    return new HistoryChatItemMenuPo();
  }

  select() {
    this.self().click();
  }
}

export class HistoryPo extends ComponentPo {
  private chat: ChatPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-history-panel"]');
    this.chat = new ChatPo();
  }

  panelOverlay() {
    return cy.get('[data-testid="rancher-ai-ui-chat-history-panel-overlay"]');
  }

  createChatButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-history-create-chat-button"]');
  }

  chatItems() {
    return this.self().get('[data-testid^="rancher-ai-ui-chat-history-chat-item-"]');
  }

  chatItem(index: number) {
    return new HistoryChatItemPo(index);
  }

  isOpen() {
    cy.wait(300); // Wait for panel transition

    return this.checkExists();
  }

  isClosed() {
    return this.checkNotExists();
  }

  open() {
    this.chat.toggleHistory();
    this.isOpen();
  }

  closeByClickOutside() {
    this.panelOverlay().click({ force: true });
    this.isClosed();
  }

  closeByClickButton() {
    this.chat.toggleHistory();
    this.isClosed();
  }

  createChat() {
    this.createChatButton().click();
  }
}
import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import RancherHeaderPo from '@/cypress/e2e/po/components/rancher-header.po';
import { MessagePo } from '@/cypress/e2e/po/message.po';
import { ConsolePo } from '@/cypress/e2e/po/console.po';

export default class ChatPo extends ComponentPo {
  rancherHeader: RancherHeaderPo;

  constructor() {
    super('[data-testid="rancher-ai-ui-chat-container"]');
    this.rancherHeader = new RancherHeaderPo();
  }

  closeButton() {
    return this.self().get('[data-testid="rancher-ai-ui-chat-close-button"]');
  }

  console() {
    return new ConsolePo();
  }

  isOpen(): Cypress.Chainable<boolean> {
    return this.self().should('exist');
  }

  isClosed(): Cypress.Chainable<boolean> {
    return this.self().should('not.exist');
  }

  open() {
    this.rancherHeader.askLizButton().click();
    this.isOpen();
  }

  close() {
    this.closeButton().click();
    this.isClosed();
  }

  getMessage(id: string | number) {
    return new MessagePo(id.toString());
  }

  sendMessage(value: string) {
    this.console().sendMessage(value);
  }
}

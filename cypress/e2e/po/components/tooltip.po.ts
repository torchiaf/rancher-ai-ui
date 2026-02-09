import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class TooltipPo extends ComponentPo {
  constructor() {
    super('.v-popper__popper .v-popper__inner');
  }

  containsText(value: string) {
    return this.self().within(() => {
      cy.contains(value).should('be.visible', { timeout: 10000 });
    });
  }

  notContainsText(value: string) {
    return this.self().within(() => {
      cy.contains(value).should('not.exist');
    });
  }
}
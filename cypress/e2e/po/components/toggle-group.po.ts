import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export class ToggleOptionPO extends ComponentPo {
  private optionName: string;

  constructor(optionName: string) {
    super(`[data-testid="rancher-ai-ui-toggle-group-item-${ optionName }"]`);
    this.optionName = optionName;
  }

  select() {
    this.self().click();
  }

  isSelected() {
    return this.self().should('have.class', 'active');
  }
}

export class ToggleGroupPO extends ComponentPo {
  constructor() {
    super('[data-testid="rancher-ai-ui-toggle-group"]');
  }

  toggleOption(optionName: string) {
    return new ToggleOptionPO(optionName);
  }
}
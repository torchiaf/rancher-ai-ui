import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';
import DefaultTabbedPo from '@rancher/cypress/e2e/po/components/tabbed.po';

export default class TabbedPo extends DefaultTabbedPo {
  constructor(selector: string) {
    super(selector);
  }

  getTabByPrefix(prefix: string) {
    return new ComponentPo(`[data-testid^="${ prefix }"]`, this.self());
  }

  addTab() {
    return this.self().get('[data-testid="tab-list-add"]').click();
  }

  removeTab() {
    return this.self().get('[data-testid="tab-list-remove"]').click();
  }

  assertTabHasLabelIcon(selector: string, iconName: string) {
    return this.self().find(`${ selector } > a > .conditions-alert-icon.${ iconName }`).should('exist');
  }
}
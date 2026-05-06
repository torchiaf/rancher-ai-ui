import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';

import ChatPo from '@/cypress/e2e/po/chat.po';

describe('UI Tools', () => {
  const chat = new ChatPo();

  /**
   * TODO
   *
   * - check the tools configuration is correctly applied in the UI (e.g. suggestions, select-option, etc.)
   * - check the tools configuration is correctly updated in the UI when the definition is updated
   * - check the tools are removed from the UI when the definition is uninstalled
   * - and more
   *
   * Note: cy.installUIToolsDefinition(); and cy.uninstallUIToolsDefinition(); will be removed after we implement the required action tests
   */

  describe('suggestions', () => {
    before(() => {
      cy.login();
      cy.installUIToolsDefinition();
    });

    beforeEach(() => {
      cy.login();

      HomePagePo.goTo();

      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    });

    it('Show the list of suggestions', () => {
      cy.enqueueLLMResponse({
        text:      ['Here', ' are the suggestions.'],
        uiTools:   [
          {
            name: 'suggestions',
            args: {
              suggestion1: 'Show me the resources',
              suggestion2: 'The list of clusters',
              suggestion3: 'Another suggestion',
            }
          }
        ]
      });

      chat.sendMessage('Show me the suggestions');

      const userMessage = chat.getMessage(2);

      userMessage.scrollIntoView();
      userMessage.containsText('Show me the suggestions');

      const resultMessage = chat.getMessage(3);

      resultMessage.option(0).scrollIntoView().should('be.visible').and('contain.text', 'Show me the resources');
      resultMessage.option(1).scrollIntoView().should('be.visible').and('contain.text', 'The list of clusters');
      resultMessage.option(2).scrollIntoView().should('be.visible').and('contain.text', 'Another suggestion');
    });

    /**
     * TODO
     *
     * Suggestions:
     *  - verify edit util
     *  - verify chat send
     *
     * All:
     *  - verify multiple tools in the same response
     *  - verify (suggestions and select-option mutual exclusion)
     *  - add 1 test for each tool type to verify the tool is correctly rendered in the UI
     *  - add the tests for the staging page
     *  - add the Settings page tests to verify the tools configuration is correctly displayed in the UI
     *  - and more
     */

    after(() => {
      cy.clearLLMResponses();
      cy.uninstallUIToolsDefinition();
    });
  });
});

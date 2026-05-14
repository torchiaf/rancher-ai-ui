import { getSpecName, moveMouseAway } from '@/cypress/e2e/utils';
import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';

const name = getSpecName();

describe(`UI tool: ${ name }`, () => {
  const chat = new ChatPo();

  it('recording timestamp', () => {
    cy.setFullScreen();

    cy.login();

    HomePagePo.goTo();

    chat.open();

    moveMouseAway();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.checkExists();

    welcomeMessage.isCompleted();

    cy.enqueueLLMResponse({
      text:      ['Hey there!', ' How', ' can I assist you today?'],
      uiTools:   [
        {
          name: 'suggestions',
          args: {
            suggestion1: 'Show me the resources in local cluster',
            suggestion2: 'Find my deployments',
            suggestion3: 'Analyze the health status of my clusters',
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz!');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Hi Liz!');

    const resultMessage = chat.getMessage(3);

    resultMessage.tool().suggestions(2).scrollIntoView().should('be.visible')
      .and('contain.text', 'Analyze the health status of my clusters');

    cy.wait(500);

    cy.recordTimestampStart(name);

    cy.wait(1000);

    resultMessage.tool().suggestions(2).realHover();

    cy.wait(1000);

    cy.enqueueLLMResponse({ text: 'The local cluster is running smoothly with all nodes healthy. No issues detected in the last 24 hours.' });

    resultMessage.tool().suggestions(2).realClick();

    moveMouseAway();

    cy.wait(3000);

    cy.recordTimestampEnd(name);
  });
});

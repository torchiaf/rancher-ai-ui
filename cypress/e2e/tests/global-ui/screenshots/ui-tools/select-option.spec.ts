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
      text:      ['I need to know which namespace your Pod is running in.'],
      uiTools:   [
        {
          name: 'select-option',
          args: {
            label:   'Select the namespace:',
            option1: 'default',
            option2: 'cattle-ai-agent-system',
            option3: 'cattle-system',
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz!');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Hi Liz!');

    const resultMessage = chat.getMessage(3);

    resultMessage.tool().selectOption(2).scrollIntoView().should('be.visible');

    cy.wait(500);

    cy.recordTimestampStart(name);

    cy.wait(1000);

    resultMessage.tool().selectOption(0).realHover();

    cy.wait(1000);
    moveMouseAway();

    resultMessage.tool().selectOption(1).realHover();

    cy.wait(1000);
    moveMouseAway();

    resultMessage.tool().selectOption(2).realHover();

    cy.wait(1000);

    cy.enqueueLLMResponse({ text: 'Selected namespace: cattle-system' });

    resultMessage.tool().selectOption(2).realClick();

    cy.wait(3000);

    cy.recordTimestampEnd(name);
  });
});

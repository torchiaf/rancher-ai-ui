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
      text:      ['You can find your pods in the local cluster explorer, check the explore button below.'],
      uiTools:   [
        {
          name: 'explore',
          args: {
            route:   'pods',
            cluster: 'local',
            label:   'View Pods'
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz! Where are my pods located?');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Hi Liz! Where are my pods located?');

    const resultMessage = chat.getMessage(3);

    resultMessage.scrollIntoView().should('be.visible');

    cy.recordTimestampStart(name);

    cy.wait(1000);

    const exploreTool = resultMessage.tool().explore('pods');

    exploreTool.realHover();

    cy.wait(1000);

    exploreTool.realClick();

    moveMouseAway();

    cy.wait(3000);

    cy.recordTimestampEnd(name);
  });
});

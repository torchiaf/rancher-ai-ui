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
      text:      ['Hey there! I provided you an example, take a look!'],
      uiTools:   [
        {
          name: 'show-yaml',
          args: {
            yaml:              'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n  namespace: cattle-system\nspec:\n  containers:\n  - name: test\n    image: rancher:latest\n    ports:\n    - containerPort: 80\n',
            resourceKind:      'pod',
            resourceName:      'test',
            resourceNamespace: 'cattle-system',
            title:             'Pod YAML'
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz! Create a new pod for me in cattle-system namespace, use rancher:head image.');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Hi Liz!');

    const resultMessage = chat.getMessage(3);

    const showYamlTool = resultMessage.tool().showYaml('pod', 'cattle-system', 'test');

    showYamlTool.scrollIntoView().should('be.visible');

    cy.recordTimestampStart(name);

    showYamlTool.realHover();

    cy.wait(500);

    showYamlTool.realClick();

    cy.wait(3500);

    cy.recordTimestampEnd(name);
  });
});

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
      text:      ['Hey there! I added the label "my-label: my-value" to your pod.'],
      uiTools:   [
        {
          name: 'show-yaml-diff',
          args: {
            original:          'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n  namespace: cattle-system\nspec:\n  containers:\n  - name: test\n    image: rancher:latest\n    ports:\n    - containerPort: 80\n',
            patched:           'apiVersion: v1\nkind: Pod\nmetadata:\n  name: test\n  namespace: cattle-system\n  labels:\n    my-label: my-value\nspec:\n  containers:\n  - name: test\n    image: rancher:latest\n    ports:\n    - containerPort: 80\n',
            resourceKind:      'pod',
            resourceName:      'test',
            resourceNamespace: 'cattle-system',
            title:             'Pod YAML'
          }
        }
      ]
    });

    chat.sendMessage('Hi Liz! Can you add the label "my-label: my-value" to my pod?');

    const userMessage = chat.getMessage(2);

    userMessage.containsText('Hi Liz!');

    const resultMessage = chat.getMessage(3);

    const showYamlTool = resultMessage.tool().showYamlDiff('pod', 'cattle-system', 'test');

    showYamlTool.scrollIntoView().should('be.visible');

    cy.recordTimestampStart(name);

    showYamlTool.realHover();

    cy.wait(1000);

    showYamlTool.realClick();

    cy.wait(3500);

    cy.recordTimestampEnd(name);
  });
});

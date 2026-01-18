import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';

describe('History Panel', () => {
  const chat = new ChatPo();
  const history = new HistoryPo();

  before(() => {
    cy.login();
    cy.cleanChatHistory();
  });

  beforeEach(() => {
    cy.login();
    cy.clearLLMResponses();

    HomePagePo.goTo();

    chat.open();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();
  });

  it('It should open and close history panel', () => {
    history.open();
    history.isOpen();

    history.closeByClickOutside();
    history.isClosed();

    history.open();
    history.isOpen();

    history.closeByClickButton();
    history.isClosed();
  });

  it('It should discard empty chats from history', () => {
    history.open();
    history.createChat();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    history.open();
    history.chatItems().should('have.length', 0);
  });

  it('It should create new chats and populate the history list', () => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const request = `Chat ${ i + 1 } - Request Request Request ${ j + 1 }`;
        const response = `Chat ${ i + 1 } - Response Response Response ${ j + 1 }`;

        cy.enqueueLLMResponse({
          text:      response,
          chunkSize: 5
        });

        chat.sendMessage(request);

        const userMessage = chat.getMessage(2 + (j * 2));

        userMessage.containsText(request);

        const responseMessage = chat.getMessage(3 + (j * 2));

        responseMessage.containsText(response);
      }

      history.open();
      history.createChat();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();
    }

    history.open();
    for (let k = 2; k >= 0; k--) {
      history.chatItem(k).checkExists();
    }
  });

  it('It should correctly load previous chats - the order of the chats and messages is correct', () => {
    for (let i = 0; i < 3; i++) {
      history.open();
      history.chatItem(i).select();
      chat.isReady();

      for (let j = 0; j < 3; j++) {
        const request = `Chat ${ 3 - i } - Request Request Request ${ j + 1 }`;
        const response = `Chat ${ 3 - i } - Response Response Response ${ j + 1 }`;

        const lastUserMessage = chat.getMessage(1 + (j * 2));

        lastUserMessage.scrollIntoView();
        lastUserMessage.containsText(request);

        const lastResponseMessage = chat.getMessage(2 + (j * 2));

        lastResponseMessage.scrollIntoView();
        lastResponseMessage.containsText(response);
      }
    }
  });

  it('It should delete chats from history', () => {
    history.open();

    for (let i = 2; i > 0; i--) {
      history.chatItem(i).checkExists();

      history.chatItem(i).menu().doAction('delete-chat');
      history.chatItems().should('have.length', i);
    }
  });

  it('It should delete active chats', () => {
    history.open();

    history.chatItem(0).select();
    chat.isReady();

    const lastUserMessage = chat.getMessage(5);

    lastUserMessage.scrollIntoView();
    lastUserMessage.containsText('Chat 3 - Request Request Request 3');

    const lastResponseMessage = chat.getMessage(6);

    lastResponseMessage.scrollIntoView();
    lastResponseMessage.containsText('Chat 3 - Response Response Response 3');

    history.open();

    const chatItem = history.chatItem(0);

    chatItem.isActive();
    chatItem.menu().doAction('delete-chat');

    // When the active chat is deleted, the chat panel initializes a new chat
    chat.isReady();
    history.isClosed();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    const otherMessage = chat.getMessage(2);

    otherMessage.checkNotExists();

    history.open();
    history.chatItems().should('have.length', 0);
  });

  it('It should properly parse messages from history chats', () => {
    // Create chat to populate history
    cy.enqueueLLMResponse({
      text: [
        '<think>',
        'Thin',
        'king about the response',
        '</think>',
        'This is a **bold** text ',
        'and this is an _italic_ text.',
        '<mcp-doclink>https://www.rancher.com/why-rancher</mcp-doclink>',
        '<mcp-doclink>https://www.rancher.com/support/</mcp-doclink>',
        ''
      ],
      tool: {
        name: 'listKubernetesResources',
        args: {
          kind:      'Deployment',
          cluster:   'local',
          namespace: 'cattle-ai-agent-system'
        }
      },
    });

    chat.sendMessage('Request message.');

    const responseMessage = chat.getMessage(3);

    responseMessage.isCompleted();

    cy.enqueueLLMResponse({
      text:      'Pod created successfully.',
      tool: {
        name: 'createKubernetesResource',
        args: {
          kind:      'Pod',
          name:      'my-pod',
          resource:  {},
          cluster:   'local',
          namespace: 'default'
        }
      },
    });

    chat.sendMessage('Create a pod');

    let confirmationRequestMessage = chat.getMessage(5);

    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.confirmButton().click();
    confirmationRequestMessage.isConfirmed();
    confirmationRequestMessage.containsText('Confirmed');

    let resultMessage = chat.getMessage(6);

    resultMessage.isCompleted();
    resultMessage.containsText('Pod created successfully.');

    cy.enqueueLLMResponse({
      text:      'Pod creation canceled.',
      tool: {
        name: 'createKubernetesResource',
        args: {
          kind:      'Pod',
          name:      'my-pod',
          resource:  {},
          cluster:   'local',
          namespace: 'default'
        }
      },
    });

    chat.sendMessage('Create a pod but cancel');

    confirmationRequestMessage = chat.getMessage(8);

    confirmationRequestMessage.isCompleted();
    confirmationRequestMessage.containsText('Are you sure you want to proceed with this action?');
    confirmationRequestMessage.cancelButton().click();
    confirmationRequestMessage.isCanceled();
    confirmationRequestMessage.containsText('Canceled');

    resultMessage = chat.getMessage(9);

    resultMessage.isCompleted();
    resultMessage.containsText('Pod creation canceled.');

    // Create a new chat to trigger the history population
    history.open();
    history.createChat();

    const welcomeMessage = chat.getMessage(1);

    welcomeMessage.isCompleted();

    // Now open history and select the previous chat
    history.open();
    history.chatItem(0).select();
    chat.isReady();

    // Verify that the message is properly parsed
    const historyResponseMessage = chat.getMessage(2);

    // Verify thinking content
    historyResponseMessage.scrollIntoView();
    historyResponseMessage.thinkingButton().click({ force: true });

    historyResponseMessage.scrollIntoView();
    historyResponseMessage.containsText('Thinking about the response');

    // Verify main content
    historyResponseMessage.containsText('This is a bold text and this is an italic text.');

    // Verify resource actions
    const deployments = [
      'llm-mock',
      'rancher-ai-agent',
      'rancher-mcp',
    ];

    deployments.forEach((name) => {
      const btn = historyResponseMessage.resourceButton(name);

      btn.should('exist');
    });

    // Verify source links
    historyResponseMessage.sourceLink(0).should('contain.text', 'Why Rancher');
    historyResponseMessage.sourceLink(1).should('contain.text', 'Support');

    // Verify confirmation action
    const historyUserMessage = chat.getMessage(3);

    historyUserMessage.scrollIntoView();
    historyUserMessage.containsText('Create a pod');

    const historyConfirmedMessage = chat.getMessage(4);

    historyConfirmedMessage.confirmButton().should('not.exist');
    historyConfirmedMessage.cancelButton().should('not.exist');
    historyConfirmedMessage.isConfirmed();
    historyConfirmedMessage.containsText('Confirmed');

    const historyResultMessage = chat.getMessage(5);

    historyResultMessage.containsText('Pod created successfully.');

    // Verify cancel action
    const historyUserMessage1 = chat.getMessage(6);

    historyUserMessage1.scrollIntoView();
    historyUserMessage1.containsText('Create a pod but cancel');

    const historyCanceledMessage = chat.getMessage(7);

    historyCanceledMessage.confirmButton().should('not.exist');
    historyCanceledMessage.cancelButton().should('not.exist');
    historyCanceledMessage.isCanceled();
    historyCanceledMessage.containsText('Canceled');

    const historyResultMessage1 = chat.getMessage(8);

    historyResultMessage1.containsText('Pod creation canceled.');
  });

  after(() => {
    cy.login();
    cy.cleanChatHistory();
  });
});
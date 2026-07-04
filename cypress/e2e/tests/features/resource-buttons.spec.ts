import HomePagePo from '@rancher/cypress/e2e/po/pages/home.po';
import ChatPo from '@/cypress/e2e/po/chat.po';
import { HistoryPo } from '@/cypress/e2e/po/history.po';
import { machineInventorySchema } from '@/cypress/e2e/blueprints/schema';

describe('Resource buttons', () => {
  const chat = new ChatPo();

  describe('Visibility observation', () => {
    before(() => {
      cy.login();
    });

    beforeEach(() => {
      cy.login();
      cy.clearLLMResponses();
      cy.cleanChatHistory();

      HomePagePo.goTo();
    });

    it('It should load resources when the message is visible', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text: [
          'test',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`).as('fetchSchema');

      chat.sendMessage('User request');

      cy.wait('@fetchSchema').its('response.statusCode').should('eq', 404);

      const resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-v8fhl' }).should('be.disabled');
    });

    it('It should not load resources when the message is not visible', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`).as('fetchSchema');

      chat.sendMessage('User request');

      let resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-v8fhl' }).should('be.disabled');

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "cattle-ai-agent-system", "kind": "Deployment", "cluster": "local", "name": "llm-mock", "type": "apps.deployment"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      // First message is visible now, it should load the resource via cluster API
      cy.wait('@fetchSchema').its('response.statusCode').should('eq', 404);

      resourceMessage = chat.getMessage(5);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      chat.close();

      chat.open();

      resourceMessage = chat.getMessage(5);

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      // First button is not visible, it should not load the resource via cluster API
      cy.get('@fetchSchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(1);
      });
    });

    it('It should load resources when the message becomes visible', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:           [
          'test',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-v8fhl", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`).as('fetchSchema');

      chat.sendMessage('User request');

      let resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-v8fhl' }).should('be.disabled');

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "cattle-ai-agent-system", "kind": "Deployment", "cluster": "local", "name": "llm-mock", "type": "apps.deployment"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      // First message is visible now, it should load the resource via cluster API
      cy.wait('@fetchSchema').its('response.statusCode').should('eq', 404);

      resourceMessage = chat.getMessage(5);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      chat.close();

      chat.open();

      resourceMessage = chat.getMessage(5);

      resourceMessage.resourceButton({ name: 'llm-mock' }).should('be.enabled');

      // First button is not visible, it should not load the resource via cluster API
      cy.get('@fetchSchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(1);
      });

      chat.messagesPanel().scrollTop();

      // First button becomes visible, it should load the resource via cluster API
      cy.wait('@fetchSchema').its('response.statusCode').should('eq', 404);
    });

    it('It should keep and not load again resources when the message becomes visible again', () => {
      chat.open();

      const welcomeMessage = chat.getMessage(1);

      welcomeMessage.isCompleted();

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "default", "kind": "VirtualMachine", "cluster": "local", "name": "vm-new", "type": "kubevirt.io.virtualmachine"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      let resourceMessage = chat.getMessage(3);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'vm-new' }).should('be.disabled');

      cy.enqueueLLMResponse({
        text:           [
          'test\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\ntest\n',
          '<mcp-response>[{"namespace": "fleet-default", "kind": "MachineInventory", "cluster": "local", "name": "e-abcde", "type": "elemental.cattle.io.machineinventory"}]</mcp-response>'
        ],
      });

      chat.sendMessage('User request');

      resourceMessage = chat.getMessage(5);

      resourceMessage.isCompleted();

      resourceMessage.resourceButton({ name: 'e-abcde' }).should('be.visible');

      chat.close();

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/kubevirt.io.virtualmachine`).as('fetchVMSchema');

      cy.intercept('GET', `/k8s/clusters/local/v1/schemas/elemental.cattle.io.machineinventory`, {
        statusCode: 200,
        body:       machineInventorySchema,
      }).as('fetchMachineInventorySchema');

      chat.open();

      // Last button is visible, it should load the resource via cluster API
      cy.wait('@fetchMachineInventorySchema').its('response.statusCode').should('eq', 200);

      // First button is not visible, it should not load the resource via cluster API
      cy.get('@fetchVMSchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(0);
      });

      chat.getMessage(5).resourceButton({ name: 'e-abcde' }).should('be.visible');

      chat.messagesPanel().scrollTop();

      welcomeMessage.self().should('be.visible');

      // Scroll back to the bottom
      chat.messagesPanel().scrollButton().self().click();

      chat.getMessage(5).resourceButton({ name: 'e-abcde' }).should('be.visible');

      // Last button become visible again, it should not load the resource again as it was already loaded
      cy.get('@fetchMachineInventorySchema.all').then((requests) => {
        expect(requests).to.have.lengthOf(1);
      });
    });

    after(() => {
      cy.clearLLMResponses();
      cy.cleanChatHistory();
    });
  });

  describe.skip('Product context switch', () => {
    it('It should correctly load resource and navigate from Home to Explorer', () => {
    });

    it('It should correctly load resource and navigate from Home to Product', () => {
    });

    it('It should correctly load resource and navigate from Product to Home', () => {
    });

    it('It should correctly load resource and navigate from Explorer to Explorer', () => {
    });

    it('It should correctly load resource and navigate from Explorer to Fleet', () => {
    });

    it('It should correctly load resource and navigate from Fleet to Explorer', () => {
    });

    it('It should correctly load resource and navigate from Explorer to Product', () => {
    });

    it('It should correctly load resource and navigate from Product to Explorer', () => {
    });
  });
});
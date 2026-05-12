export interface LlmResponseArgs {
  agent?: string | null;
  text?: string | string[];
  chunkSize?: number;
  mcpTool?: Tool;
  uiTools?: Tool[];
}

export interface Tool {
  name: string;
  args: object | object[];
}

export interface InstallRancherAIServiceArgs {
  waitForAIServiceReady?: boolean;
}

declare global {
  namespace Cypress {
    interface Chainable {
      enqueueLLMResponse(args: LlmResponseArgs): void;
      clearLLMResponses(): void;
      cleanChatHistory(): void;
      installRancherAIService(args?: InstallRancherAIServiceArgs): void;
      uninstallRancherAIService(): void;
      agentDBPersistencyEnabled(value: boolean): void;
      createAgentConfig(config: object): void;
      updateAgentConfig(config: object): void;
      deleteAgentConfig(config: object): void;
      installUIToolsDefinition(): void;
      updateUIToolsDefinition(): void;
      uninstallUIToolsDefinition(): void;
      // Utils for video recording
      recordTimestampStart(name: string): void;
      recordTimestampEnd(name: string): void;
      setFullScreen(): void;
    }
  }
}

export {};
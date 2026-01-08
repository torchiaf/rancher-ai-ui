import { extendConfig } from '@rancher/cypress/extend-config';

export default extendConfig({
  env: {
    helmChartDir: './rancher-ai-agent',
    llmMockServiceProxyPath: '/api/v1/namespaces/cattle-ai-agent-system/services/http:llm-mock:80/proxy',
    chatServiceProxyPath: '/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-chat:80/proxy'
  },
  e2e: {
    supportFile: 'cypress/support/e2e.ts'
  }
});
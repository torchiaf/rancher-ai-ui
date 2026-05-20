import ComponentPo from '@rancher/cypress/e2e/po/components/component.po';

export default class ToolPo extends ComponentPo {
  suggestions(index: number) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-list-option-${ index }"]`);
  }

  selectOption(index: number) {
    return this.self().get(`[data-testid="rancher-ai-ui-chat-message-list-option-${ index }"]`);
  }

  explore(route: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-tool-explore-${ route }"]`);
  }

  openConsoleLogs(cluster: string, namespace: string, name: string, containerName: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-tool-open-console-logs-${ cluster }-${ namespace }-${ name }-${ containerName }"]`);
  }

  showYaml(resourceKind: string, resourceNamespace: string, resourceName: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-tool-show-yaml-${ resourceKind }-${ resourceNamespace }-${ resourceName }"]`);
  }

  showYamlDiff(resourceKind: string, resourceNamespace: string, resourceName: string) {
    return this.self().get(`[data-testid="rancher-ai-ui-tool-show-yaml-diff-${ resourceKind }-${ resourceNamespace }-${ resourceName }"]`);
  }
}
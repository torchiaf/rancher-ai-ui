import { IExtension } from '@shell/core/types';
import { RIGHT } from '@shell/utils/position';

export const PRODUCT_NAME = 'rancher-ai-ui';
export const BLANK_CLUSTER = '_';

export const AGENT_NAMESPACE = 'cattle-ai-agent-system';
export const AGENT_NAME = 'rancher-ai-agent';
export const AGENT_WS_API_PATH = 'v1/ws/messages';
export const AGENT_REST_API_PATH = 'v1/api';

// Single-click installation of the AI agent
export const AGENT_REPO_NAME = 'rancher-ai';
export const AGENT_REPO_URL = 'oci://registry.suse.com/rancher/charts/rancher-ai-agent';
// Enable when the OCI registry requires credentials; they are stored in a basic-auth secret referenced by the ClusterRepo
export const AGENT_REPO_AUTH_ENABLED = false;
export const AGENT_REPO_AUTH_SECRET_NAMESPACE = 'cattle-system';
export const AGENT_REPO_AUTH_SECRET_GENERATE_NAME = 'clusterrepo-auth-';
export const AGENT_CHART_NAME = 'rancher-ai-agent';
export const AGENT_RELEASE_NAME = 'rancher-ai-agent';
// Used when Rancher's system-default-registry setting is empty
export const AGENT_DEFAULT_REGISTRY = 'stgregistry.suse.com';

export const RANCHER_AI_SCHEMA = { AI_AGENT_CONFIG: 'ai.cattle.io.aiagentconfig' };

export const RANCHER_AI_UI_LABELS = { UI_TOOLS: 'rancher-ai-ui-tools' };

export const AGENT_CONFIG_SECRET_NAME = 'llm-secret';
export const AGENT_CONFIG_CONFIG_MAP_NAME = 'llm-config';
export const TOOLS_CONFIG_NAME = 'rancher-ai-ui';

export const PANEL_POSITION = RIGHT;

export const PERMISSIONS_DOCS_URL = 'https://rancher.github.io/rancher-ai-product-docs/rancher-ai/latest/en/how-tos/how-to-admin.html#rbac';

export function init($extension: IExtension, store: any) {
  // Configure Settings page to include AI Assistant settings
  const {
    basicType,
    mapGroup,
    virtualType,
  } = $extension.DSL(store, 'settings');

  basicType([PRODUCT_NAME]);

  virtualType({
    labelKey:   'aiConfig.label',
    name:       PRODUCT_NAME,
    namespaced: false,
    route:      { name: `c-cluster-settings-${ PRODUCT_NAME }` }
  });

  // Configure Rancher AI group
  mapGroup('ai.cattle.io', 'Rancher AI');
}
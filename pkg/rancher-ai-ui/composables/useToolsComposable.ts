import semver from 'semver';
import { ref } from 'vue';
import { useStore } from 'vuex';
import { NotificationLevel } from '@shell/types/notifications';
import toolsConfigData from '../ui-tools.json';
import { getRancherVersion, uiVersion } from '../utils/version';
import { useAIAgentApiComposable } from './useAIAgentApiComposable';
import { UIToolsConfigPayload } from 'types';

const TOOLS_CONFIG_NAME = 'rancher-ai-ui';
const RANCHER_VERSION_KEY = 'rancher-version';
const UI_VERSION_KEY = 'ui-version';

/**
 * Composable for managing the UI tools configuration and interactions.
 * @returns Composable for managing the UI tools configuration and interactions.
 */
export function useToolsComposable() {
  const store = useStore();

  // Default tools selector based on the tools configuration, filtering tools based on Rancher version compatibility.
  const defaultToolsSelector = ref({
    name:  TOOLS_CONFIG_NAME,
    tools: toolsConfigData.tools
      .filter((tool) => !tool.metadata[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]))
      .map((tool) => tool.name)
  });

  const { publishTools } = useAIAgentApiComposable();

  async function publishToolsDefinition() {
    const payload: UIToolsConfigPayload = {
      ...toolsConfigData,
      name:     TOOLS_CONFIG_NAME,
      metadata: {
        annotations: {
          ...toolsConfigData.metadata.annotations,
          [UI_VERSION_KEY]: uiVersion
        }
      },
    };

    const result = await publishTools(payload);

    if (result.updated) {
      store.dispatch('notifications/add', {
        id:      `${ TOOLS_CONFIG_NAME }-tools-updated`, // TODO: How to create multiple?
        level:   NotificationLevel.Warning,
        title:   'Rancher AI Assistant UI Tools Updated', // TODO: i18n
        message: 'The Rancher AI Assistant UI Tools have been successfully updated.' // TODO: i18n
      });
    }
  }

  return {
    defaultToolsSelector,
    publishToolsDefinition
  };
}

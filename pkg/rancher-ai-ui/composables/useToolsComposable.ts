import semver from 'semver';
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { NotificationLevel } from '@shell/types/notifications';
import toolsConfigData from '../ui-tools.json';
import { getRancherVersion, uiVersion } from '../utils/version';
import { useAIAgentApiComposable } from './useAIAgentApiComposable';
import { UIToolsConfig, UIToolsConfigPayload } from 'types';

const TOOLS_CONFIG_NAME = 'rancher-ai-ui';
const RANCHER_VERSION_KEY = 'rancher-version';
const UI_VERSION_KEY = 'ui-version';

/**
 * Composable for managing the UI tools configuration and interactions.
 * @returns Composable for managing the UI tools configuration and interactions.
 */
export function useToolsComposable() {
  const store = useStore();
  const { t } = useI18n(store);

  const toolsConfig = computed<UIToolsConfig>(() => store.getters['rancher-ai-ui/tools/config']);

  // Default tools selector based on the tools configuration, filtering tools based on Rancher version compatibility.
  const defaultToolsSelector = computed(() => {
    if (!toolsConfig.value?.config?.enabled) {
      return undefined;
    }

    return {
      name:  TOOLS_CONFIG_NAME,
      tools: (toolsConfig.value?.tools || [])
        .filter((tool) => !tool.metadata[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]))
        .map((tool) => tool.name)
    };
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

    store.commit('rancher-ai-ui/tools/setConfig', result?.resource || {});

    /**
     * If no result is null, we assume the API returned 404 -> the AI Agent is not installed or available.
     * The UI will retry as soon as the Agent becomes available.
     */
    if (!result) {
      return;
    }

    if (result.error) {
      store.dispatch('notifications/add', {
        level:   NotificationLevel.Error,
        title:   t('aiConfig.form.section.tools.notifications.error.title'),
        message: t('aiConfig.form.section.tools.notifications.error.message')
      });

      return;
    }

    if (result.created) {
      store.dispatch('notifications/add', {
        level:   NotificationLevel.Success,
        title:   t('aiConfig.form.section.tools.notifications.created.title'),
        message: t('aiConfig.form.section.tools.notifications.created.message')
      });

      return;
    }

    if (result.reset) {
      store.dispatch('notifications/add', {
        level:   NotificationLevel.Warning,
        title:   t('aiConfig.form.section.tools.notifications.reset.title'),
        message: t('aiConfig.form.section.tools.notifications.reset.message', { message: result.message || '' }, true)
      });

      return;
    }

    if (result.updated) {
      store.dispatch('notifications/add', {
        level:   NotificationLevel.Info,
        title:   t('aiConfig.form.section.tools.notifications.updated.title'),
        message: t('aiConfig.form.section.tools.notifications.updated.message', { message: result.message || '' }, true)
      });
    }
  }

  return {
    toolsConfig,
    defaultToolsSelector,
    publishToolsDefinition
  };
}

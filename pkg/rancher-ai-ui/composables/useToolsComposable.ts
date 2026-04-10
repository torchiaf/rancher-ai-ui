import semver from 'semver';
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { CONFIG_MAP } from '@shell/config/types';
import { NotificationLevel } from '@shell/types/notifications';
import { AGENT_NAMESPACE, RANCHER_AI_UI_LABELS, TOOLS_CONFIG_NAME } from '../product';
import { warn } from '../utils/log';
import { getRancherVersion, uiVersion } from '../utils/version';
import { compareSpecConfig, compareSpecTools, hasChanges } from '../utils/tools';
import toolsConfigData from '../ui-tools.json';
import { UITool, UIToolsConfig, UIToolsConfigs } from '../types';

const RANCHER_VERSION_KEY = 'rancher-version';
const UI_VERSION_KEY = 'ui-version';

/**
 * Composable for managing the UI tools configuration and interactions.
 * @returns Composable for managing the UI tools configuration and interactions.
 */
export function useToolsComposable() {
  const store = useStore();
  const { t } = useI18n(store);

  const toolsConfigMap = computed(() => store.getters['management/byId'](CONFIG_MAP, `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`));

  /**
   * Default tools selector based on the tools configuration,
   * filtering tools based on Rancher version compatibility.
   */
  const defaultToolsSelector = computed(() => {
    let configs = {} as UIToolsConfigs;

    try {
      configs = JSON.parse(toolsConfigMap.value?.data?.config || '{}');
    } catch (err) {
      warn('Failed to parse UI Tools Config ConfigMap data:', { err });
    }

    if (!configs.config?.enabled || !configs.tools?.length) {
      return undefined;
    }

    return {
      name:  TOOLS_CONFIG_NAME,
      tools: configs.tools
        .filter((tool: UITool) => !tool.metadata[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]))
        .map((tool: UITool) => tool.name)
    };
  });

  async function publishToolsDefinition() {
    let configMap;

    // First, attempt to find the existing ConfigMap
    try {
      configMap = await store.dispatch('management/find', {
        type: CONFIG_MAP,
        id:   `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`
      });
    } catch (err) { // eslint-disable-line no-unused-vars
    }

    // Create the new ConfigMap if it doesn't exist
    if (!configMap) {
      configMap = await store.dispatch('management/create', {
        type:     CONFIG_MAP,
        metadata: {
          name:        TOOLS_CONFIG_NAME,
          namespace:   AGENT_NAMESPACE,
          labels:      { app: RANCHER_AI_UI_LABELS.UI_TOOLS },
          annotations: {
            ...(toolsConfigData.metadata?.annotations || {}),
            [UI_VERSION_KEY]: uiVersion
          }
        },
        data: {
          config: JSON.stringify({
            config: toolsConfigData.config,
            tools:  toolsConfigData.tools
          }),
        }
      });

      // Notify creation
      try {
        await configMap.save();

        store.dispatch('notifications/add', {
          level:   NotificationLevel.Success,
          title:   t('aiConfig.form.section.tools.notifications.created.title'),
          message: t('aiConfig.form.section.tools.notifications.created.message')
        });
      } catch (err) {
        warn(`Unable to create UI Tools Config ConfigMap ${ configMap.metadata.name }: `, { err });
      }

      return;
    }

    // Extract current tools and config from ConfigMap data (parse JSON strings)
    let configs = {} as UIToolsConfigs;

    try {
      configs = JSON.parse(toolsConfigMap.value?.data?.config || '{}');
    } catch (err) {
      warn('Failed to parse UI Tools Config ConfigMap data:', { err });
    }

    const {
      config: currentConfig = {} as UIToolsConfig,
      tools:  currentTools = [] as UITool[]
    } = configs;

    // Compare with hasChanges before publishing
    const changesDetected = hasChanges(
      toolsConfigData.tools,
      currentTools,
      toolsConfigData.config,
      currentConfig
    );

    if (!changesDetected) {
      return;
    }

    // Variables to track changes for user notifications
    const addedTools = [];
    const updatedTools = [];
    const removedTools = [];
    const resetToolUserValues = {} as Record<string, { name: string; from: any; to: any }>;
    let updatedConfig = false;
    const resetConfigUserValues = {} as Record<string, { from: any; to: any }>;

    // Build new tools array instead of modifying in place
    const newTools: UITool[] = [];
    const currentToolsByName = Object.fromEntries(currentTools.map((t) => [t.name, t]));
    const providedToolsByName = Object.fromEntries(toolsConfigData.tools.map((t) => [t.name, t]));

    for (const tool of currentTools) {
      if (!providedToolsByName[tool.name]) {
        // Track removed tools
        removedTools.push(tool.name);
      }
    }

    for (const tool of toolsConfigData.tools) {
      if (!currentToolsByName[tool.name]) {
        // Add new tool
        newTools.push(tool);

        // Track added tools
        addedTools.push(tool.name);
      } else {
        // Track updated tools
        if (compareSpecTools(tool, currentToolsByName[tool.name])) {
          updatedTools.push(tool.name);
        }

        const toolToUpdate = {
          ...tool,
          enabled: currentToolsByName[tool.name].enabled // Preserve enabled state
        };

        // Update existing tools based on revision
        const providedToolRevision = tool.revision || 0;
        const currentToolRevision = currentToolsByName[tool.name].revision || 0;

        if (providedToolRevision > currentToolRevision) {
          if (toolToUpdate.enabled !== providedToolsByName[tool.name].enabled) {
            // Track tool updates in resetToolUserValues
            updatedTools.push(tool.name);
            resetToolUserValues[tool.name] = {
              name: 'enabled',
              from: currentToolsByName[tool.name].enabled,
              to:   providedToolsByName[tool.name].enabled
            };

            // Force enabled to be updated to the provided value since it's a new revision with changes
            toolToUpdate.enabled = providedToolsByName[tool.name].enabled;
          }
        }

        newTools.push(toolToUpdate);
      }
    }

    // Build new config - always preserve user's enabled and systemPrompt values
    const newConfig = {
      ...toolsConfigData.config,
      enabled:      currentConfig.enabled,
      systemPrompt: currentConfig.systemPrompt
    };

    // Track if config spec (excluding enabled/systemPrompt) changed
    if (compareSpecConfig(toolsConfigData.config, currentConfig)) {
      updatedConfig = true;
    }

    const providedConfigRevision = toolsConfigData.config.revision || 0;
    const currentConfigRevision = currentConfig.revision || 0;

    if (providedConfigRevision > currentConfigRevision) {
      if (newConfig.enabled !== toolsConfigData.config.enabled) {
        // Track config updates in resetConfigUserValues
        resetConfigUserValues['enabled'] = {
          from: currentConfig.enabled,
          to:   toolsConfigData.config.enabled
        };

        // Force enabled to be updated to the provided value since it's a new revision with changes
        newConfig.enabled = toolsConfigData.config.enabled;
      }

      if (newConfig.systemPrompt !== toolsConfigData.config.systemPrompt) {
        // Track config updates in resetConfigUserValues
        resetConfigUserValues['systemPrompt'] = {
          from: currentConfig.systemPrompt,
          to:   toolsConfigData.config.systemPrompt
        };

        // Force systemPrompt to be updated to the provided value since it's a new revision with changes
        newConfig.systemPrompt = toolsConfigData.config.systemPrompt;
      }
    }

    // Update ConfigMap data with JSON strings
    configMap.data = {
      config: JSON.stringify({
        config: newConfig,
        tools:  newTools
      })
    };

    try {
      await configMap.save();
    } catch (err) {
      warn(`Unable to update UI Tools Config ConfigMap ${ configMap.metadata.name }: `, { err });

      store.dispatch('notifications/add', {
        level:   NotificationLevel.Error,
        title:   t('aiConfig.form.section.tools.notifications.error.title'),
        message: t('aiConfig.form.section.tools.notifications.error.message')
      });

      return;
    }

    let message = '';

    if (Object.keys(resetConfigUserValues).length > 0 || Object.keys(resetToolUserValues).length > 0) {
      if (Object.keys(resetConfigUserValues).length > 0) {
        message += `${ Object.entries(resetConfigUserValues).map(([key, { from, to }]) => `Config: ${ key } from: ${ from }, to: ${ to }`).join(';\n') }`;
      }

      if (Object.keys(resetToolUserValues).length > 0) {
        message += `${ Object.entries(resetToolUserValues).map(([toolName, { name, from, to }]) => `Tool: ${ toolName } - ${ name } from: ${ from }, to: ${ to }`).join(';\n') }`;
      }

      store.dispatch('notifications/add', {
        level:   NotificationLevel.Warning,
        title:   t('aiConfig.form.section.tools.notifications.reset.title'),
        message: t('aiConfig.form.section.tools.notifications.reset.message', { message }, true)
      });
    }

    if (updatedConfig || updatedTools.length > 0 || removedTools.length > 0 || addedTools.length > 0) {
      message += updatedTools.length > 0 ? `Updated tools: ${ updatedTools.join(', ') }\n` : '';
      message += removedTools.length > 0 ? `Removed tools: ${ removedTools.join(', ') }\n` : '';
      message += addedTools.length > 0 ? `Added tools: ${ addedTools.join(', ') }\n` : '';

      store.dispatch('notifications/add', {
        level:   NotificationLevel.Info,
        title:   t('aiConfig.form.section.tools.notifications.updated.title'),
        message: t('aiConfig.form.section.tools.notifications.updated.message', { message }, true)
      });
    }
  }

  return {
    defaultToolsSelector,
    publishToolsDefinition
  };
}

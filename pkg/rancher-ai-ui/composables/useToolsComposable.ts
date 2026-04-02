import semver from 'semver';
import { computed } from 'vue';
import { useStore } from 'vuex';
import { AGENT_NAMESPACE, RANCHER_AI_SCHEMA } from '../product';
import { useI18n } from '@shell/composables/useI18n';
import { NotificationLevel } from '@shell/types/notifications';
import { warn } from '../utils/log';
import { getRancherVersion, uiVersion } from '../utils/version';
import { compareSpecConfig, compareSpecTools, hasChanges } from '../utils/tools';
import toolsConfigData from '../ui-tools.json';
import { UITool, UIToolsConfigCRD } from 'types';

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

  const toolsConfig = computed<UIToolsConfigCRD>(() => store.getters['management/byId'](RANCHER_AI_SCHEMA.UI_TOOLS_CONFIG, `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`));

  /**
   * Default tools selector based on the tools configuration,
   * filtering tools based on Rancher version compatibility.
   */
  const defaultToolsSelector = computed(() => {
    if (!toolsConfig.value?.spec?.config?.enabled) {
      return undefined;
    }

    return {
      name:  TOOLS_CONFIG_NAME,
      tools: (toolsConfig.value?.spec?.tools || [])
        .filter((tool) => !tool.metadata[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]))
        .map((tool) => tool.name)
    };
  });

  async function publishToolsDefinition() {
    let toolsConfig;

    // First, attempt to find the existing config
    try {
      toolsConfig = await store.dispatch('management/find', {
        type: RANCHER_AI_SCHEMA.UI_TOOLS_CONFIG,
        id:   `${ AGENT_NAMESPACE }/${ TOOLS_CONFIG_NAME }`
      });
    } catch (err) { // eslint-disable-line no-unused-vars
    }

    // Create the new config
    if (!toolsConfig) {
      toolsConfig = await store.dispatch('management/create', {
        type:     RANCHER_AI_SCHEMA.UI_TOOLS_CONFIG,
        metadata: {
          name:        TOOLS_CONFIG_NAME,
          namespace:   AGENT_NAMESPACE,
          annotations: {
            ...(toolsConfigData.metadata?.annotations || {}),
            [UI_VERSION_KEY]: uiVersion
          },
        },
        spec: {
          tools:  toolsConfigData.tools,
          config: toolsConfigData.config,
        }
      });

      // Notify users about creation
      try {
        await toolsConfig.save();

        store.dispatch('notifications/add', {
          level:   NotificationLevel.Success,
          title:   t('aiConfig.form.section.tools.notifications.created.title'),
          message: t('aiConfig.form.section.tools.notifications.created.message')
        });
      } catch (err) {
        warn(`Unable to create UI Tools Config CRD ${ toolsConfig.metadata.name }: `, { err });
      }

      return;
    }

    // Extract current tools and config from the cluster state for comparison
    const {
      tools: currentTools,
      config: currentConfig
    } = toolsConfig.spec as UIToolsConfigCRD['spec'];

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

    // Merge new config with existing config
    toolsConfig.spec = {
      tools:  [] as UITool[],
      config: {}
    } as UIToolsConfigCRD['spec'];

    // Update spec tools
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
        toolsConfig.spec.tools.push(tool);

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

        toolsConfig.spec.tools.push(toolToUpdate);
      }
    }

    // Update spec config - always preserve user's enabled and systemPrompt values from current config
    toolsConfig.spec.config = {
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
      if (toolsConfig.spec.config.enabled !== toolsConfigData.config.enabled) {
        // Track config updates in resetConfigUserValues
        resetConfigUserValues['enabled'] = {
          from: currentConfig.enabled,
          to:   toolsConfigData.config.enabled
        };

        // Force enabled to be updated to the provided value since it's a new revision with changes
        toolsConfig.spec.config.enabled = toolsConfigData.config.enabled;
      }

      if (toolsConfig.spec.config.systemPrompt !== toolsConfigData.config.systemPrompt) {
        // Track config updates in resetConfigUserValues
        resetConfigUserValues['systemPrompt'] = {
          from: currentConfig.systemPrompt,
          to:   toolsConfigData.config.systemPrompt
        };

        // Force systemPrompt to be updated to the provided value since it's a new revision with changes
        toolsConfig.spec.config.systemPrompt = toolsConfigData.config.systemPrompt;
      }
    }

    try {
      await toolsConfig.save();
    } catch (err) {
      warn(`Unable to update UI Tools Config CRD ${ toolsConfig.metadata.name }: `, { err });

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

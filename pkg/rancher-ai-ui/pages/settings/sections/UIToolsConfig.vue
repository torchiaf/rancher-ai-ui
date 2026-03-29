<script setup lang="ts">
import semver from 'semver';
import debounce from 'lodash/debounce';
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Checkbox from '@components/Form/Checkbox/Checkbox.vue';
import ToggleSwitch from '@components/Form/ToggleSwitch/ToggleSwitch.vue';
import Banner from '@components/Banner/Banner.vue';
import FilterPanel from '@shell/components/FilterPanel.vue';
import TextAreaAutoGrow from '@components/Form/TextArea/TextAreaAutoGrow.vue';
import { getRancherVersion } from '../../../utils/version';
import toolsConfigData from '../../../ui-tools.json';

const store = useStore();
const { t } = useI18n(store);

import type { UIToolsConfigCRD } from '../../../types';

const RANCHER_VERSION_KEY = 'rancher-version';

const props = defineProps({
  value: {
    type:     Object as () => UIToolsConfigCRD,
    required: true,
  },
  readOnly: {
    type:    Boolean,
    default: false,
  }
});

const emit = defineEmits(['update:value']);

const searchQuery = ref('');
const debouncedSearchQuery = ref('');
const filters = ref({ categories: [] as string[] });

const internalFilters = ref({ categories: [] as string[] });

const isFilterUpdating = ref(false);

// Debounce search query
const debouncedSearch = debounce((q: string) => {
  debouncedSearchQuery.value = q;
}, 300);

// Get unique categories from tools
const categoryOptions = computed(() => {
  const categories = new Set<string>();

  props.value.spec?.tools?.forEach((tool) => {
    if (tool.category) {
      categories.add(tool.category);
    }
  });

  return Array.from(categories).sort().map((cat) => ({
    value: cat.toLowerCase(),
    label: cat.charAt(0).toUpperCase() + cat.slice(1)
  }));
});

// Filter panel configuration
const filterPanelFilters = computed(() => [
  {
    key:     'categories',
    title:   t('generic.category'),
    options: categoryOptions.value
  }
]);

// Filter tools based on search and category filters
const filteredTools = computed(() => {
  let tools = props.value.spec?.tools || [];

  // Filter by Rancher version compatibility
  tools = tools.filter((tool) => !tool.metadata?.[RANCHER_VERSION_KEY] || semver.satisfies(getRancherVersion(), tool.metadata[RANCHER_VERSION_KEY]));

  // Filter by search query
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase();

    tools = tools.filter((tool) => tool.name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query)
    );
  }

  // Filter by categories
  if (filters.value.categories.length > 0) {
    tools = tools.filter((tool) => filters.value.categories.includes(tool.category.toLowerCase())
    );
  }

  return tools;
});

const enabledToolsCount = computed(() => filteredTools.value.filter((t) => t.enabled).length
);

const totalMessage = computed(() => {
  const count = !isFilterUpdating.value ? filteredTools.value.length : '...';

  if (filters.value.categories.length === 0 && !searchQuery.value) {
    return t('aiConfig.form.section.tools.total', { count });
  }

  return t('aiConfig.form.section.tools.matched', { count });
});

const noFiltersApplied = computed(() => filters.value.categories.length === 0 && !searchQuery.value
);

// Handle filter changes
const onFilterChange = (newFilters: any) => {
  isFilterUpdating.value = true;
  internalFilters.value = newFilters;
  applyFiltersDebounced(newFilters);
};

const applyFiltersDebounced = debounce((newFilters: any) => {
  filters.value = newFilters;
  isFilterUpdating.value = false;
}, 100);

// Update tool enabled state
const updateToolEnabled = (toolName: string, enabled: boolean) => {
  if (props.value.spec?.tools) {
    const tool = props.value.spec.tools.find((t) => t.name === toolName);

    if (tool) {
      tool.enabled = enabled;
      emit('update:value', { ...props.value });
    }
  }
};

// Reset filters
const resetAllFilters = () => {
  internalFilters.value = { categories: [] };
  filters.value = { categories: [] };
  searchQuery.value = '';
  debouncedSearchQuery.value = '';
};

// Focus search
const searchRef = ref<HTMLInputElement>();
const focusSearch = () => {
  if (searchRef.value) {
    searchRef.value.focus();
    searchRef.value.select();
  }
};

// Reset config fields to default values
const resetConfigToDefaults = () => {
  if (props.value.spec) {
    props.value.spec.config.enabled = toolsConfigData.config.enabled;
    props.value.spec.config.systemPrompt = toolsConfigData.config.systemPrompt;
    emit('update:value', { ...props.value });
  }
};

// Reset tools to default values
const resetToolsToDefaults = () => {
  if (props.value.spec?.tools) {
    props.value.spec.tools.forEach((tool) => {
      const defaultTool = toolsConfigData.tools.find((t: any) => t.name === tool.name);

      if (defaultTool) {
        tool.enabled = defaultTool.enabled;
      }
    });
    emit('update:value', { ...props.value });
  }
};
</script>

<template>
  <div class="ui-tools-config-container">
    <div class="form-values-row">
      <div class="row">
        <div class="col span-12">
          <Checkbox
            class="form-value-checkbox"
            :value="props.value.spec.config.enabled"
            :label="t('aiConfig.form.section.tools.fields.enabled.label')"
            :disabled="readOnly"
            @input="(val: any) => { props.value.spec.config.enabled = val; emit('update:value', { ...props.value }); }"
          />
        </div>
      </div>

      <div class="row">
        <div class="col span-12">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.tools.fields.systemPrompt.label') }}
            <i
              v-clean-tooltip="t('aiConfig.form.section.tools.fields.systemPrompt.tooltip')"
              class="icon icon-info tooltip-icon"
            />
          </h3>
        </div>
      </div>
      <div class="row textarea-with-validation">
        <TextAreaAutoGrow
          :value="props.value.spec.config.systemPrompt"
          :disabled="readOnly"
          :placeholder="t('aiConfig.form.section.tools.fields.systemPrompt.placeholder')"
          :min-height="100"
          :max-height="150"
          @update:value="(val: string) => { props.value.spec.config.systemPrompt = val; emit('update:value', { ...props.value }); }"
        />
        <!-- <i
          v-if="systemPromptValidationStatus.touched && !systemPromptValidationStatus.focused && !selectedAgent.spec.systemPrompt"
          v-clean-tooltip="t('aiConfig.form.section.aiAgent.sections.systemPrompt.requiredTooltip')"
          class="icon icon-warning textarea-validation-icon"
        /> -->
      </div>
      <div class="row">
        <div class="col span-4">
          <button
            class="btn role-tertiary"
            :disabled="readOnly"
            @click="resetConfigToDefaults"
          >
            {{ t('aiConfig.form.resetToDefaults', {}, true) }}
          </button>
        </div>
      </div>
      <!-- <div
        v-if="!isAgentLocked && !props.readOnly"
        class="row"
      >
        <div class="col span-4">
          <FileSelector
            role="button"
            class="btn role-tertiary pull-left"
            :label="t('aiConfig.form.section.aiAgent.fields.systemPrompt.uploadButton')"
            @selected="onFileSelected"
          />
        </div>
      </div> -->
    </div>

    <!-- Tools Management Section -->
    <div class="form-values-row">
      <div class="row">
        <div class="col span-6">
          <h3 class="m-0">
            {{ t('aiConfig.form.section.tools.fields.tools.label') }}
          </h3>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-input">
        <input
          ref="searchRef"
          v-model="searchQuery"
          type="search"
          class="input"
          :placeholder="t('aiConfig.form.section.tools.search', {}, true)"
          :aria-label="t('aiConfig.form.section.tools.search', {}, true)"
          role="textbox"
          @input="debouncedSearch(searchQuery)"
        >
        <i
          v-if="!searchQuery"
          class="icon icon-search"
        />
      </div>

      <!-- Keyboard shortcut to focus search -->
      <button
        v-shortkey.once="['/']"
        class="hide"
        @shortkey="focusSearch()"
      />

      <!-- Banner for any errors -->
      <Banner
        v-if="!value.spec?.tools || value.spec.tools.length === 0"
        color="warning"
        :label="t('aiConfig.form.section.tools.noTools', {}, true)"
      />

      <div class="wrapper">
        <!-- Filter Panel -->
        <FilterPanel
          :model-value="internalFilters"
          :filters="filterPanelFilters"
          @update:modelValue="onFilterChange"
        />

        <!-- Empty State -->
        <div
          v-if="filteredTools.length === 0"
          class="empty-state"
        >
          <h3 class="empty-state-title">
            {{ t('aiConfig.form.section.tools.noMatchingTools', {}, true) }}
          </h3>
          <div class="empty-state-content">
            <p>{{ t('aiConfig.form.section.tools.tryAdjustingFilters', {}, true) }}</p>
            <button
              v-if="!noFiltersApplied"
              class="reset-filters-btn"
              @click="resetAllFilters"
            >
              {{ t('aiConfig.form.section.tools.resetFilters', {}, true) }}
            </button>
          </div>
        </div>

        <!-- Tools List -->
        <div
          v-else
          class="right-section"
        >
          <!-- Total and Controls -->
          <div class="total-and-controls">
            <div class="total">
              <p class="total-message">
                {{ totalMessage }}
                <span
                  v-if="enabledToolsCount > 0"
                  class="enabled-count"
                >
                  ({{ enabledToolsCount }} enabled)
                </span>
              </p>
              <button
                v-if="!noFiltersApplied"
                class="reset-filters-link"
                @click="resetAllFilters"
              >
                {{ t('aiConfig.form.section.tools.resetFilters', {}, true) }}
              </button>
            </div>
            <div class="text-right">
              <button
                class="btn role-tertiary"
                :disabled="readOnly || !props.value.spec?.tools || props.value.spec.tools.length === 0"
                @click="resetToolsToDefaults"
              >
                {{ t('aiConfig.form.resetToDefaults', {}, true) }}
              </button>
            </div>
          </div>

          <!-- Tools Cards Grid -->
          <div class="tools-grid">
            <div
              v-for="tool in filteredTools"
              :key="tool.name"
              class="tool-card"
            >
              <!-- Card Header -->
              <div class="card-header">
                <div class="card-title-section">
                  <h4 class="card-title">
                    {{ t(`aiConfig.form.section.tools.fields.tools.name.${tool.name}`, {}, true) || tool.name }}
                  </h4>
                  <span class="card-category">{{ tool.category }}</span>
                </div>
                <ToggleSwitch
                  :value="tool.enabled"
                  :disabled="readOnly"
                  @input="updateToolEnabled(tool.name, $event)"
                />
              </div>

              <!-- Card Content -->
              <div class="card-content">
                <p class="card-description">
                  {{ tool.description }}
                </p>
              </div>

              <!-- Card Footer -->
              <div class="card-footer">
                <span class="version-badge">v{{ tool.revision }}</span>
                <span
                  v-if="tool.metadata?.interactive"
                  class="interactive-badge"
                >
                  {{ t('aiConfig.form.section.tools.interactive', {}, true) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-tools-config-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-values-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-value-checkbox {
  width: fit-content;
}

.form-row-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.text-label {
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  color: var(--body-text-secondary);
}

.search-input {
  position: relative;

  input {
    height: 48px;
    width: 100%;
    padding-left: 16px;
    padding-right: 16px;
    border: 1px solid var(--input-border);
    border-radius: 4px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }

    &::placeholder {
      color: var(--input-placeholder-text);
    }
  }

  .icon-search {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 16px;
    color: var(--input-placeholder-text);
  }
}

.hide {
  display: none;
}

.wrapper {
  display: flex;
  gap: var(--gap-lg);
  width: 100%;
  min-width: 0;
}

.empty-state {
  width: 100%;
  padding: 72px 120px;
  text-align: center;

  .empty-state-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 24px 0;
    color: var(--body-text);
  }

  .empty-state-content {
    p {
      font-size: 14px;
      color: var(--body-text-secondary);
      margin: 0 0 24px 0;
    }
  }
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}

.total-and-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--gap-md);
  padding: 8px 0;

  .total {
    display: flex;
    align-items: center;
    gap: 8px;

    .total-message {
      font-size: 16px;
      font-weight: 600;
      color: var(--body-text);
      margin: 0;

      .enabled-count {
        color: var(--body-text-secondary);
        font-weight: 400;
      }
    }

    .reset-filters-link {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: var(--primary-hover);
      }
    }
  }
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--gap-md);
  width: 100%;
  height: max-content;
  overflow: hidden;
  min-width: 0;

  .tool-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card-background);
    overflow: hidden;
    transition: all 0.2s ease;
    min-width: 0;

    &:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      border-bottom: 1px solid var(--border);
      gap: 12px;

      .card-title-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--body-text);
          margin: 0;
          word-break: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-category {
          font-size: 12px;
          color: var(--body-text-secondary);
          background: var(--badge-background);
          padding: 2px 8px;
          border-radius: 3px;
          width: fit-content;
          text-transform: capitalize;
        }
      }

      :deep(.checkbox),
      :deep(.toggle-switch) {
        flex-shrink: 0;
        margin-top: 2px;
      }
    }

    .card-content {
      flex: 1;
      padding: 16px;

      .card-description {
        font-size: 14px;
        color: var(--body-text-secondary);
        line-height: 1.5;
        margin: 0;
      }
    }

    .card-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      background: var(--card-footer-background);

      .version-badge,
      .interactive-badge {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 3px;
        background: var(--badge-background);
        color: var(--body-text-secondary);
      }

      .interactive-badge {
        background: var(--success-background);
        color: var(--success-text);
      }
    }
  }
}

.reset-filters-btn {
  padding: 8px 16px;
  border: 1px solid var(--primary);
  border-radius: 4px;
  background: transparent;
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--primary);
    color: white;
  }
}

.m-0 {
  margin: 0;
}

.mb-8 {
  margin-bottom: 8px;
}

.mt-4 {
  margin-top: 4px;
}

.textarea-with-validation {
  position: relative;

  .textarea-validation-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--error);
    cursor: pointer;
    z-index: 10;
  }
}

.tooltip-icon {
  color: var(--input-label);
  margin-left: 8px;
  cursor: pointer;
}

.required {
  color: var(--error);
}

.text-right {
  text-align: right;
}
</style>

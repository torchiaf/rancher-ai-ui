<script lang="ts" setup>
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  RcDropdown,
  RcDropdownTrigger,
} from '@components/RcDropdown';
import { Agent, ChatUsage, UsageTotals } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  usage: {
    type:    Object as PropType<ChatUsage | null>,
    default: null,
  },
  agents: {
    type:    Array as PropType<Agent[]>,
    default: () => [],
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['open']);

function onOpenChange(isOpen: boolean) {
  if (isOpen) {
    emit('open');
  }
}

const totals = computed(() => [
  {
    key:   'totalTokens',
    label: t('ai.console.tokenUsage.total'),
    value: (props.usage?.totalTokens || 0).toLocaleString(),
  },
  {
    key:   'inputTokens',
    label: t('ai.console.tokenUsage.input'),
    value: (props.usage?.inputTokens || 0).toLocaleString(),
  },
  {
    key:   'outputTokens',
    label: t('ai.console.tokenUsage.output'),
    value: (props.usage?.outputTokens || 0).toLocaleString(),
  },
]);

function agentLabel(name: string) {
  const agent = props.agents.find((a) => a.name === name);

  return agent?.displayName || name;
}

function sourceLabel(source: string) {
  const key = `aiConfig.form.section.usage.sources.${ source }`;

  return store.getters['i18n/exists'](key) ? t(key) : source;
}

// eslint-disable-next-line no-unused-vars
function toRows(group: Record<string, UsageTotals> | undefined, label: (key: string) => string) {
  return Object.entries(group || {})
    .map(([key, totals]) => ({
      key,
      label: label(key),
      value: totals.totalTokens.toLocaleString(),
      total: totals.totalTokens,
    }))
    .sort((a, b) => b.total - a.total);
}

const sections = computed(() => [
  {
    key:   'byAgent',
    title: t('ai.console.tokenUsage.byAgent'),
    rows:  toRows(props.usage?.byAgent, agentLabel),
  },
  {
    key:   'bySource',
    title: t('ai.console.tokenUsage.bySource'),
    rows:  toRows(props.usage?.bySource, sourceLabel),
  },
].filter((section) => section.rows.length));
</script>

<template>
  <div
    class="token-usage"
    data-testid="rancher-ai-ui-chat-console-token-usage"
  >
    <rc-dropdown
      placement="top-start"
      @update:open="onOpenChange"
    >
      <rc-dropdown-trigger
        variant="ghost"
        small
        class="token-usage-trigger"
        :disabled="props.disabled"
        :aria-label="t('ai.console.tokenUsage.title')"
        data-testid="rancher-ai-ui-chat-console-token-usage-button"
      >
        <i class="icon icon-gear" />
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <div
          class="token-usage-content"
          data-testid="rancher-ai-ui-chat-console-token-usage-content"
        >
          <span class="token-usage-title">
            {{ t('ai.console.tokenUsage.title') }}
          </span>
          <div
            v-for="item in totals"
            :key="item.key"
            class="token-usage-row"
            :data-testid="`rancher-ai-ui-chat-console-token-usage-${ item.key }`"
          >
            <span class="token-usage-row-label">{{ item.label }}</span>
            <span class="token-usage-row-value text-deemphasized">{{ item.value }}</span>
          </div>
          <div
            v-for="section in sections"
            :key="section.key"
            class="token-usage-section"
            :data-testid="`rancher-ai-ui-chat-console-token-usage-${ section.key }`"
          >
            <span class="token-usage-section-title">{{ section.title }}</span>
            <div
              v-for="row in section.rows"
              :key="row.key"
              class="token-usage-row"
            >
              <span class="token-usage-row-label">{{ row.label }}</span>
              <span class="token-usage-row-value text-deemphasized">{{ row.value }}</span>
            </div>
          </div>
        </div>
      </template>
    </rc-dropdown>
  </div>
</template>

<style lang="scss" scoped>
.token-usage {
  margin-right: auto;

  .token-usage-trigger {
    height: 32px;
    width: 32px;
    min-width: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.token-usage-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  min-width: 200px;

  .token-usage-title {
    font-weight: 600;
  }

  .token-usage-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--border);

    .token-usage-section-title {
      font-weight: 600;
      font-size: 12px;
    }
  }

  .token-usage-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;

    .token-usage-row-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .token-usage-row-value {
      white-space: nowrap;
    }
  }
}
</style>

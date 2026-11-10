<script setup lang="ts">
import {
  computed, onMounted, ref, watch, type PropType
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { MANAGEMENT } from '@shell/config/types';
import Banner from '@components/Banner/Banner.vue';
import ButtonGroup from '@shell/components/ButtonGroup.vue';
import Loading from '@shell/components/Loading.vue';
import RcButton from '@components/RcButton/RcButton.vue';
import { useAIAgentApiComposable } from '../../../../composables/useAIAgentApiComposable';
import {
  AdminUsage, AIAgentConfigCRD, UsageAnalytics, UsagePeriod, UsageTotals
} from '../../../../types';
import { warn } from '../../../../utils/log';
import UsageTable, { UsageTableRow } from './UsageTable.vue';

const UNKNOWN = 'unknown';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  isAdmin: {
    type:    Boolean,
    default: false,
  },
  agents: {
    type:    Array as PropType<AIAgentConfigCRD[]>,
    default: () => [],
  },
});

const { fetchUsage, fetchAdminUsage } = useAIAgentApiComposable();

const period = ref<UsagePeriod>('week');
const isLoading = ref(true);
const hasError = ref(false);

const usage = ref<UsageAnalytics | null>(null);
const adminUsage = ref<AdminUsage | null>(null);

const periodOptions = computed(() => (['day', 'week', 'month'] as UsagePeriod[]).map((value) => ({
  value,
  label: t(`aiConfig.form.section.usage.period.${ value }`),
})));

function unknownLabel(value: string) {
  return value === UNKNOWN ? t('aiConfig.form.section.usage.unknown') : value;
}

function agentLabel(name: string) {
  return props.agents.find((crd) => crd.metadata?.name === name)?.spec?.displayName || unknownLabel(name);
}

function userLabel(userId: string) {
  if (userId === UNKNOWN) {
    return t('aiConfig.form.section.usage.unknown');
  }

  const user = store.getters['management/byId'](MANAGEMENT.USER, userId);

  return user?.nameDisplay || user?.username || userId;
}

function sourceLabel(source: string) {
  const key = `aiConfig.form.section.usage.sources.${ source }`;

  return store.getters['i18n/exists'](key) ? t(key) : source;
}

function toRows(group: Record<string, UsageTotals> | undefined, label: Function): UsageTableRow[] {
  return Object.entries(group || {}).map(([key, totals]) => ({
    key,
    label: label(key),
    totals,
  }));
}

const summary = computed(() => {
  const all = adminUsage.value;
  const mine = usage.value;

  return [
    {
      key:   'totalTokens',
      value: all?.totalTokens ?? mine?.totalTokens
    },
    {
      key:   'inputTokens',
      value: all?.inputTokens ?? mine?.inputTokens
    },
    {
      key:   'outputTokens',
      value: all?.outputTokens ?? mine?.outputTokens
    },
    {
      key:   'cacheReadTokens',
      value: all?.cacheReadTokens ?? mine?.cacheReadTokens
    },
    {
      key:   'llmCalls',
      value: all?.llmCalls ?? mine?.llmCalls
    },
    all ? {
      key:   'userCount',
      value: all.userCount
    } : {
      key:   'chatCount',
      value: mine?.chatCount
    },
  ].map((item) => ({
    ...item,
    value: (item.value || 0).toLocaleString()
  }));
});

const byUserRows = computed(() => toRows(adminUsage.value?.byUser, userLabel));
const byAgentRows = computed(() => toRows(usage.value?.byAgent, agentLabel));
const bySourceRows = computed(() => toRows(usage.value?.bySource, sourceLabel));

const byModelRows = computed<UsageTableRow[]>(() => Object.entries(usage.value?.byModel || {})
  .flatMap(([provider, models]) => Object.entries(models).map(([model, totals]) => ({
    key:      `${ provider }/${ model }`,
    label:    unknownLabel(model),
    sublabel: unknownLabel(provider),
    totals,
  }))));

const topChatRows = computed<UsageTableRow[]>(() => (usage.value?.topChats || []).map(({ chatId, name, ...totals }) => ({
  key:   chatId,
  label: name || chatId,
  totals,
})));

const byDay = computed(() => {
  const days = usage.value?.byDay || [];
  const max = Math.max(...days.map((d) => d.totalTokens), 0);

  return days.map((day) => ({
    date:    day.date,
    total:   day.totalTokens,
    percent: max ? Math.max(day.totalTokens / max * 100, day.totalTokens ? 2 : 0) : 0,
    label:   t('aiConfig.form.section.usage.byDay.bar', {
      date:  day.date,
      count: day.totalTokens.toLocaleString()
    }),
  }));
});

async function loadUsage() {
  isLoading.value = true;
  hasError.value = false;

  try {
    const [mine, all] = await Promise.all([
      fetchUsage(period.value),
      props.isAdmin ? fetchAdminUsage(period.value) : Promise.resolve(null),
    ]);

    usage.value = mine;
    adminUsage.value = all;
  } catch (err) {
    warn('Unable to fetch token usage: ', err);
    hasError.value = true;
  }

  isLoading.value = false;
}

async function loadUsers() {
  if (!props.isAdmin) {
    return;
  }

  try {
    await store.dispatch('management/findAll', { type: MANAGEMENT.USER });
  } catch (err) {
    warn('Unable to fetch users: ', err);
  }
}

watch(period, loadUsage);

onMounted(() => {
  loadUsers();
  loadUsage();
});
</script>

<template>
  <div
    class="usage-dashboard"
    data-testid="rancher-ai-ui-settings-usage-dashboard"
  >
    <div class="usage-toolbar">
      <ButtonGroup
        :value="period"
        :options="periodOptions"
        :aria-label="t('aiConfig.form.section.usage.period.label')"
        data-testid="rancher-ai-ui-settings-usage-period"
        @update:value="period = $event"
      />
      <RcButton
        small
        variant="secondary"
        :disabled="isLoading"
        :aria-label="t('aiConfig.form.section.usage.refresh')"
        data-testid="rancher-ai-ui-settings-usage-refresh"
        @click="loadUsage"
      >
        <i
          class="icon icon-refresh"
          :class="{ 'icon-spin': isLoading }"
        />
        {{ t('aiConfig.form.section.usage.refresh') }}
      </RcButton>
    </div>

    <!-- Keep the content mounted while reloading, so the page height and scroll position don't change -->
    <Loading
      v-if="isLoading && !usage"
      mode="relative"
    />

    <Banner
      v-else-if="hasError"
      class="m-0"
      color="error"
      :label="t('aiConfig.form.section.usage.error')"
    />

    <template v-else-if="usage">
      <div
        class="usage-summary"
        data-testid="rancher-ai-ui-settings-usage-summary"
      >
        <div
          v-for="item in summary"
          :key="item.key"
          class="usage-card"
          :data-testid="`rancher-ai-ui-settings-usage-summary-${ item.key }`"
        >
          <span class="usage-card-value">{{ item.value }}</span>
          <span class="usage-card-label text-muted">{{ t(`aiConfig.form.section.usage.summary.${ item.key }`) }}</span>
        </div>
      </div>

      <div
        v-if="byDay.length"
        class="usage-by-day"
        data-testid="rancher-ai-ui-settings-usage-by-day"
      >
        <h3>{{ t('aiConfig.form.section.usage.byDay.title') }}</h3>
        <div class="usage-by-day-chart">
          <div
            v-for="day in byDay"
            :key="day.date"
            v-clean-tooltip="day.label"
            class="usage-by-day-column"
            :aria-label="day.label"
            role="img"
          >
            <div
              class="usage-by-day-bar"
              :style="{ height: `${ day.percent }%` }"
            />
          </div>
        </div>
        <div class="usage-by-day-axis text-muted">
          <span>{{ byDay[0].date }}</span>
          <span>{{ byDay[byDay.length - 1].date }}</span>
        </div>
      </div>

      <template v-if="adminUsage">
        <div class="usage-group-header">
          <h3>{{ t('aiConfig.form.section.usage.allUsers.title') }}</h3>
          <span class="text-muted">{{ t('aiConfig.form.section.usage.allUsers.description') }}</span>
        </div>
        <UsageTable
          :title="t('aiConfig.form.section.usage.tables.byUser')"
          :label-column="t('aiConfig.form.section.usage.columns.user')"
          :rows="byUserRows"
          data-testid="rancher-ai-ui-settings-usage-by-user"
        />
      </template>

      <div
        v-if="adminUsage"
        class="usage-group-header"
      >
        <h3>{{ t('aiConfig.form.section.usage.myChats.title') }}</h3>
        <span class="text-muted">{{ t('aiConfig.form.section.usage.myChats.description') }}</span>
      </div>
      <div class="usage-tables">
        <UsageTable
          :title="t('aiConfig.form.section.usage.tables.byModel')"
          :label-column="t('aiConfig.form.section.usage.columns.model')"
          :sublabel-column="t('aiConfig.form.section.usage.columns.provider')"
          :rows="byModelRows"
          data-testid="rancher-ai-ui-settings-usage-by-model"
        />
        <UsageTable
          :title="t('aiConfig.form.section.usage.tables.topChats')"
          :label-column="t('aiConfig.form.section.usage.columns.chat')"
          :rows="topChatRows"
          data-testid="rancher-ai-ui-settings-usage-top-chats"
        />
        <UsageTable
          :title="t('aiConfig.form.section.usage.tables.byAgent')"
          :label-column="t('aiConfig.form.section.usage.columns.agent')"
          :rows="byAgentRows"
          data-testid="rancher-ai-ui-settings-usage-by-agent"
        />
        <UsageTable
          :title="t('aiConfig.form.section.usage.tables.bySource')"
          :label-column="t('aiConfig.form.section.usage.columns.source')"
          :rows="bySourceRows"
          data-testid="rancher-ai-ui-settings-usage-by-source"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.usage-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;

  h3 {
    margin: 0;
  }
}

.usage-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .icon {
    margin-right: 4px;
  }
}

.usage-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;

  .usage-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background-color: var(--body-bg);

    .usage-card-value {
      font-size: 22px;
      font-weight: 600;
    }
  }
}

.usage-by-day {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .usage-by-day-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 120px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .usage-by-day-column {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }

  .usage-by-day-bar {
    width: 100%;
    border-radius: 2px 2px 0 0;
    background-color: var(--primary);
  }

  .usage-by-day-axis {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }
}

.usage-group-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.usage-tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 24px;
}
</style>

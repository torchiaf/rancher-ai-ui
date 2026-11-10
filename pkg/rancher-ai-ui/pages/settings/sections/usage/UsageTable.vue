<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { UsageTotals } from '../../../../types';

export interface UsageTableRow {
  key: string;
  label: string;
  sublabel?: string;
  totals: UsageTotals;
}

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  title: {
    type:     String,
    required: true,
  },
  labelColumn: {
    type:     String,
    required: true,
  },
  sublabelColumn: {
    type:    String,
    default: '',
  },
  rows: {
    type:    Array as PropType<UsageTableRow[]>,
    default: () => [],
  },
});

const sortedRows = computed(() => [...props.rows].sort((a, b) => b.totals.totalTokens - a.totals.totalTokens));

const grandTotal = computed(() => props.rows.reduce((acc, row) => acc + row.totals.totalTokens, 0));

function share(row: UsageTableRow): number {
  return grandTotal.value ? Math.round(row.totals.totalTokens / grandTotal.value * 100) : 0;
}

function format(value: number): string {
  return (value || 0).toLocaleString();
}
</script>

<template>
  <div class="usage-table">
    <h3 class="usage-table-title">
      {{ props.title }}
    </h3>
    <p
      v-if="!sortedRows.length"
      class="text-muted"
    >
      {{ t('aiConfig.form.section.usage.empty') }}
    </p>
    <table v-else>
      <thead>
        <tr>
          <th>{{ props.labelColumn }}</th>
          <th v-if="props.sublabelColumn">
            {{ props.sublabelColumn }}
          </th>
          <th class="numeric">
            {{ t('aiConfig.form.section.usage.columns.llmCalls') }}
          </th>
          <th class="numeric">
            {{ t('aiConfig.form.section.usage.columns.inputTokens') }}
          </th>
          <th class="numeric">
            {{ t('aiConfig.form.section.usage.columns.outputTokens') }}
          </th>
          <th class="numeric">
            {{ t('aiConfig.form.section.usage.columns.totalTokens') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in sortedRows"
          :key="row.key"
        >
          <td class="label-cell">
            <span class="label-text">{{ row.label }}</span>
            <div
              class="share-bar"
              :style="{ width: `${ share(row) }%` }"
              aria-hidden="true"
            />
          </td>
          <td v-if="props.sublabelColumn">
            {{ row.sublabel }}
          </td>
          <td class="numeric">
            {{ format(row.totals.llmCalls) }}
          </td>
          <td class="numeric">
            {{ format(row.totals.inputTokens) }}
          </td>
          <td class="numeric">
            {{ format(row.totals.outputTokens) }}
          </td>
          <td class="numeric total">
            {{ format(row.totals.totalTokens) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.usage-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  .usage-table-title {
    margin: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      font-weight: 600;
      color: var(--input-label);
    }

    .numeric {
      text-align: right;
      white-space: nowrap;
    }

    .total {
      font-weight: 600;
    }

    .label-cell {
      word-break: break-word;

      .share-bar {
        height: 3px;
        margin-top: 4px;
        border-radius: 2px;
        background-color: var(--primary);
        opacity: 0.6;
      }
    }
  }
}
</style>

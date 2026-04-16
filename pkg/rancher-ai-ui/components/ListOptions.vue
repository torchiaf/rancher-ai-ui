<script setup lang="ts">
import { type PropType } from 'vue';
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  label: {
    type:    String,
    default: () => '',
  },
  options: {
    type:    Array as PropType<string[]>,
    default: () => ([] as string[]),
  },
  showEdit: {
    type:    Boolean,
    default: false,
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['select', 'edit']);

const hoveredIndex = ref<number | null>(null);
</script>

<template>
  <div class="list-options-container">
    <div class="list-options-header">
      {{ props.label || t('ai.message.suggestions.label') }}
    </div>
    <ul class="list-options-list">
      <li
        v-for="(option, index) in props.options"
        :key="index"
        class="list-options-item"
      >
        <div
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = null"
        >
          <div class="button-group">
            <RcButton
              tertiary
              small
              :data-testid="`rancher-ai-ui-chat-message-suggestion-${index}`"
              :disabled="props.disabled"
              @click="() => emit('select', option)"
            >
              <span class="rc-button-label">
                {{ option }}
              </span>
            </RcButton>
            <RcButton
              v-if="props.showEdit && hoveredIndex === index"
              tertiary
              small
              :data-testid="`rancher-ai-ui-chat-message-suggestion-edit-${index}`"
              :disabled="props.disabled"
              @click="() => emit('edit', option)"
            >
              <i class="icon icon-edit" />
            </RcButton>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style lang='scss' scoped>
.list-options-header {
  margin-bottom: 8px;
  font-weight: 600;
}

.list-options-list {
  padding: 0 0 0 24px;
  margin: 0;
  list-style-position: outside;
  list-style-type: disc;

  li {
    padding: 0;
    margin: 0;

    &::marker {
      color: var(--primary);
      font-size: 15px;
    }

    .btn-sm {
      margin-bottom: 2px;
      line-height: 24px;
      min-height: 24px;
    }
  }
}

.list-options-item {
  padding: 0;
  margin: 0;
}

.button-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.rc-button-label {
  word-break: break-word;
  white-space: normal;
  text-align: left;
}
</style>
<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';
import { useStore } from 'vuex';
import { debounce } from 'lodash';
import { Agent } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import TextLabelPopover from '../popover/TextLabel.vue';
import VerifyResultsDisclaimer from '../../static/VerifyResultsDisclaimer.vue';
import { useInputComposable } from '../../composables/useInputComposable';

import PromptAutocompleteTextarea from '../PromptAutocompleteTextarea.vue';

import type { PropType } from 'vue';

const store = useStore();
const t = store.getters['i18n/t'];

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  agent: {
    type: Object as PropType<Agent | null>,
    default: null,
  },
  autocomplete: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['input:content', 'fetch:autocomplete']);

const { inputText, updateInput, cleanInput } = useInputComposable();

// Send message
function sendContent() {
  if (!inputText.value || props.disabled) return;

  emit('input:content', cleanInput(inputText.value));
  // This is the ONLY place input is cleared
  updateInput('');
}

// Debounced autocomplete fetch
const fetchAutocompleteDebounced = debounce((prompt: string) => {
  emit('fetch:autocomplete', prompt);
}, 300);

function handleFetchAutocomplete(prompt: string) {
  fetchAutocompleteDebounced(prompt);
}
</script>

<template>
  <div class="chat-console">
    <PromptAutocompleteTextarea
      v-model="inputText"
      :disabled="props.disabled"
      :autocomplete="props.autocomplete"
      @submit="sendContent"
      @fetch:autocomplete="handleFetchAutocomplete"
    >
      <template #send>
        <RcButton
          small
          :disabled="!inputText || props.disabled"
          @click="sendContent"
        >
          <i class="icon icon-lg icon-send" />
        </RcButton>
      </template>
    </PromptAutocompleteTextarea>

    <div class="chat-console-row chat-console-chat-text-info">
      <span class="chat-model label text-deemphasized">
        {{
          !!props.agent
            ? t('ai.agent.label', { name: props.agent.name, model: props.agent.model }, true)
            : t('ai.agent.unknown')
        }}
      </span>
      <TextLabelPopover
        :label="t('ai.agent.verifyResults.button.label')"
        :disabled="props.disabled"
      >
        <VerifyResultsDisclaimer />
      </TextLabelPopover>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-console {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 0.75rem;
  border-top: 1px solid var(--border);
  min-height: 70px;
}

.chat-model {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  font-size: 12px;
}

.chat-console-row.chat-console-chat-text-info {
  justify-content: flex-start;
}
</style>

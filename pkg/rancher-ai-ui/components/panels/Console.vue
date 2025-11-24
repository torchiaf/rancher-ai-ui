<script lang="ts" setup>
import {
  ref, computed, defineProps, defineEmits, nextTick,
  onMounted,
  watch,
  onUpdated
} from 'vue';
import { useStore } from 'vuex';
import { debounce } from 'lodash';
import { Agent } from '../../types';
import RcButton from '@components/RcButton/RcButton.vue';
import TextLabelPopover from '../popover/TextLabel.vue';
import VerifyResultsDisclaimer from '../../static/VerifyResultsDisclaimer.vue';
import { useInputComposable } from '../../composables/useInputComposable';

import type { PropType } from 'vue';

/**
 * Console panel for AI chat messages input and info about the Agent.
 */

const store = useStore();
const t = store.getters['i18n/t'];

const props = defineProps({
  disabled: {
    type:    Boolean,
    default: false,
  },
  agent: {
    type:     Object as PropType<Agent | null>,
    default:  null,
  },
  autocomplete: {
    type:     String,
    default:  '',
  }
});

const emit = defineEmits(['input:content', 'fetch:autocomplete']);

const { inputText, updateInput, cleanInput } = useInputComposable();

const promptTextarea = ref<HTMLTextAreaElement | null>(null);
const mirror = ref<HTMLDivElement | null>(null);
const textBeforeCursor = ref<HTMLSpanElement | null>(null);
const floatingLabel = ref<HTMLSpanElement | null>(null);

const text = computed(() => {
  if (props.disabled) {
    return '';
  }

  return inputText.value;
});

function onInputMessage(event: Event) {
  updateInput((event?.target as HTMLTextAreaElement)?.value);
  autoResizePrompt();
}

function handleTextareaKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    sendContent(event);
  }
}

function sendContent(event: Event) {
  event.preventDefault();
  event.stopPropagation();

  emit('input:content', cleanInput(text.value));

  updateInput('');
  updateAutocompleteLabel('');
}

function autoResizePrompt(height?: number) {
  const textarea = promptTextarea.value;

  if (textarea) {
    textarea.style.overflow = parseInt(textarea.style.height) > 90 ? 'auto' : 'hidden';
    textarea.style.height = 'auto';
    textarea.style.height = `${ height || textarea.scrollHeight }px`;
  }
}

const fetchAutocompleteDebounced = debounce((prompt: string) => {
  emit('fetch:autocomplete', prompt);
}, 1000);

function updateTextBeforeCursor(value: string) {
  if (textBeforeCursor.value) {
    textBeforeCursor.value.textContent = value;
  }
}

function updateAutocompleteLabel(value: string) {
  if (floatingLabel.value) {
    floatingLabel.value.textContent = value;
  }
}

function onTab() {
  console.log('Tab key pressed - ignoring for label position update');

  // const textarea = promptTextarea.value as HTMLTextAreaElement;

  // textarea.value = textarea.value + floatingLabel.textContent;
  const neu = text.value + floatingLabel.value?.textContent;

  updateInput(neu);
  autoResizePrompt();

  updateAutocompleteLabel('');
  fetchAutocompleteDebounced(neu);
}

function handleAutocomplete() {
  const textarea = promptTextarea.value as HTMLTextAreaElement;
  const container = textarea.closest('.chat-console-row') as HTMLDivElement;

  if (mirror.value) {
    mirror.value.style.width = `${ textarea.offsetWidth }px`;
  }

  // Attach the same handler to multiple events for continuous tracking
  textarea.addEventListener('input', updateCompletion);
  // textarea.addEventListener('keyup', updateCompletion);
  textarea.addEventListener('click', updateCompletion);
  textarea.addEventListener('scroll', syncScroll);

  function updateCompletion(event: KeyboardEvent | InputEvent | MouseEvent | Event | null = null) {
    // console.log(event);

    if (event) {
      const keyboardEvent = event as KeyboardEvent;

      if (keyboardEvent.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();

        return;
      }

      if (keyboardEvent.key === 'ArrowUp' ||
            keyboardEvent.key === 'ArrowDown' ||
            keyboardEvent.key === 'ArrowLeft' ||
            keyboardEvent.key === 'ArrowRight' ||
            keyboardEvent.key === 'Enter') {
        // Don't update position on arrow keys or enter
        return;
      }

      const inputEvent = event as InputEvent;

      if ((inputEvent.inputType === 'deleteContentBackward' || inputEvent.inputType === 'deleteContentForward') && textarea.value.length === 0) {
        updateAutocompleteLabel('');

        return;
      }

      const mouseEvent = event as MouseEvent;

      if (mouseEvent.type === 'click') {
        // Don't update position on click
        return;
      }
    }

    // 1. Get the current cursor position (character index)
    const cursorPos = textarea.selectionStart;
    const textValue = textarea.value;

    // 2. Split the text into two parts: before the cursor, and after/rest
    const textBefore = textValue.substring(0, cursorPos);
    // const textAfter = textValue.substring(cursorPos);

    // 3. Update the mirror div content
    // The textBefore is copied to the span, pushing the floatingLabel to the cursor's location.
    updateTextBeforeCursor(textBefore);

    // Update floating label content based on autocomplete
    if (textValue[textValue.length - 1] === floatingLabel.value?.textContent[0]) {
      updateAutocompleteLabel(floatingLabel.value.textContent.slice(1));
    } else {
      // Call autocomplete function to get the new suggestion with a small debounce
      fetchAutocompleteDebounced(textValue);
    }

    // OPTIONAL: You can include textAfter in the mirror to maintain full document height
    // for accurate scrolling, but for basic positioning, it's often not needed.
    // mirrorDiv.textContent = textValue;

    // 4. Ensure the container has focus state for CSS styling (hiding/showing label)

    container.classList.toggle('has-content', textValue.length > 0); //

    // The scroll position must be synchronized or the position will be wrong on scroll
    syncScroll();
  }

  function syncScroll() {
    if (mirror.value) {
      mirror.value.scrollTop = textarea.scrollTop;
    }
  }
}

onMounted(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
  });

  handleAutocomplete();
});

onUpdated(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
  });
});

watch(promptTextarea, (el) => {
  if (el) {
    nextTick(() => el.focus());
  }
}, {});

watch(() => text.value, () => {
  nextTick(() => {
    autoResizePrompt();
  });
}, {});

watch(() => props.autocomplete, (newVal) => {
  updateAutocompleteLabel(newVal);
});
</script>

<template>
  <div class="chat-console">
    <div
      class="chat-console-row"
    >
      <div
        ref="mirror"
        class="mirror"
      >
        <span ref="textBeforeCursor"></span>
        <span
          ref="floatingLabel"
          class="floating-label"
        ></span>
      </div>
      <textarea
        ref="promptTextarea"
        class="chat-input"
        :class="{ disabled: props.disabled }"
        rows="1"
        :value="text"
        :disabled="props.disabled"
        autocomplete="off"
        @input="onInputMessage"
        @keydown="handleTextareaKeydown"
        @keydown.tab.prevent="onTab"
      />
      <div
        class="chat-input-send"
        :class="{ disabled: props.disabled }"
      >
        <RcButton
          small
          :disabled="!text || props.disabled"
          @click="sendContent"
          @keydown.enter="sendContent"
        >
          <i class="icon icon-lg icon-send" />
        </RcButton>
      </div>
    </div>
    <div class="chat-console-row chat-console-chat-text-info">
      <span class="chat-model label text-deemphasized">
        {{ !!props.agent ? t('ai.agent.label', { name: props.agent.name, model: props.agent.model }, true) : t('ai.agent.unknown') }}
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

<style lang='scss' scoped>
.chat-console {
  display: flex;
  flex-direction: column;
  padding: 16px 16px 16px 16px;
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

.chat-console-row {
  position: relative;
  display: flex;
  align-items: end;
  gap: 8px;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.chat-input {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 1rem;
  outline: none;
  color: var(--input-text);
  transition: border 0.2s;
  width: auto;
  outline-offset: 0;
  resize: none;
  overflow: auto;
  min-height: 36px;
  max-height: 90px;
}

.chat-input:focus {
  border: solid 1.5px var(--secondary-border, var(--primary));
}

.chat-input-send {
  .btn {
    height: 36px;
  }
}

.chat-console-chat-text-info {
  justify-content: flex-start;
}

.chat-input, .mirror {
  /* Must be the same size, font, padding, etc. */
  // width: 300px;
  height: 150px;
  padding: 10px;
  margin: 0;
  box-sizing: border-box;
  font-family: monospace; /* Easier to align monospace */
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap; /* Crucial for preserving line breaks */
  overflow: hidden; /* Or auto, depending on desired behavior */
}

.mirror {
  position: absolute;
  top: 0;
  left: 0;
  /* Make the background transparent so the textarea is visible */
  background: transparent;
  pointer-events: none; /* Ignore mouse events on the mirror */
  z-index: 10; /* Keep it layered correctly */
  color: transparent; /* Make the copied text invisible */
}

/* Style for the actual floating label */
.floating-label {
  /* Allows the label to be placed right after the preceding text */
  // display: inline-block;
  background-color: transparent;
  color: var(--input-text);
  opacity: 0.3;
  padding: 2px 0;
  border-radius: 3px;
  position: relative;
  /* Adjust this value if you need to lift the label slightly above the line */
  top: 1px;
  margin-left: -8px; /* Small gap after the cursor */
  // white-space: nowrap; /* Prevent the label itself from wrapping */
}
</style>

<script setup lang="ts">
import {
  ref,
  computed,
  defineProps,
  defineEmits,
  nextTick,
  onMounted,
  watch,
  onUpdated,
} from 'vue';
import { debounce } from 'lodash';
import { useStore } from 'vuex';

const store = useStore();

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: '',
  },
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
  (e: 'fetch:autocomplete', prompt: string): void;
}>();

const promptTextarea = ref<HTMLTextAreaElement | null>(null);
const mirror = ref<HTMLDivElement | null>(null);
const textBeforeCursor = ref<HTMLSpanElement | null>(null);

const suggestion = ref('');

const suppressAutocomplete = ref(true);

const textProxy = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
});

function autoResizePrompt() {
  const textarea = promptTextarea.value;
  const ghost = mirror.value;
  if (!textarea || !ghost) return;

  ghost.style.height = 'auto';

  const rawHeight = ghost.scrollHeight || 0;
  const min = 36;
  const max = 90;
  const targetHeight = Math.min(Math.max(rawHeight, min), max);

  ghost.style.height = `${targetHeight}px`;
  textarea.style.height = `${targetHeight}px`;
  textarea.style.overflow = targetHeight >= max ? 'auto' : 'hidden';
}

function updateTextBeforeCursor(value: string) {
  if (textBeforeCursor.value) {
    textBeforeCursor.value.textContent = value;
  }
}

function updateAutocompleteLabel(value: string) {
  suggestion.value = value || '';
}

/**
 * Only sync mirror position & cursor.
 * DO NOT touch autocomplete here anymore.
 */
function syncMirror() {
  const textarea = promptTextarea.value;
  const ghost = mirror.value;
  if (!textarea || !ghost) return;

  const cursorPos = textarea.value.length;
  const textValue = textarea.value;

  updateTextBeforeCursor(textValue.substring(0, cursorPos));

  ghost.scrollTop = textarea.scrollTop;
  textarea.style.width = `${ghost.offsetWidth}px`;
}

/**
 * Debounced "input is stable" signal.
 */
const scheduleStableAutocomplete = debounce((prompt: string) => {
  suppressAutocomplete.value = false;
  emit('fetch:autocomplete', prompt);
}, 500);

/**
 * On every input:
 * - Resize
 * - Sync cursor/mirror
 * - Schedule autocomplete fetch once input is stable
 */
function handleInput() {
  nextTick(() => {
    syncMirror();
    autoResizePrompt();
    scheduleStableAutocomplete(textProxy.value);
  });
}

function handleClick() {
  syncMirror();
}

function handleScroll() {
  const textarea = promptTextarea.value;
  if (mirror.value && textarea) {
    mirror.value.scrollTop = textarea.scrollTop;
  }
}

/**
 * Unified keydown:
 * - INSTANT autocomplete clearing on typing keys
 * - Enter submit
 * - Tab handled separately
 */
function handleKeydown(event: KeyboardEvent) {
  if (
    event.key.length === 1 ||
    event.key === 'Backspace' ||
    event.key === 'Delete'
  ) {
    suppressAutocomplete.value = true;
    scheduleStableAutocomplete.cancel?.();
    updateAutocompleteLabel('');
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('submit');
    return;
  }
}

function onParentResize() {
  syncMirror();
  autoResizePrompt();
}

/**
 * Tab / Shift+Tab behavior:
 * - Tab: accept full autocomplete remainder
 * - Shift+Tab: accept next word from autocomplete remainder
 */
function onTab(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();

  const labelText = suggestion.value || '';
  if (!labelText) return;

  const current = props.modelValue;

  // TAB → accept full remainder
  if (!event.shiftKey) {
    const neu = current + labelText;

    textProxy.value = neu;
    nextTick(() => {
      syncMirror();
      autoResizePrompt();
    });

    updateAutocompleteLabel('');

    suppressAutocomplete.value = false;
    scheduleStableAutocomplete(neu);
    return;
  }

  // SHIFT+TAB → accept next word only
  const remainder = labelText;
  const match = remainder.match(/^\s*\S+(\s*)?/);
  if (!match) return;

  const chunk = match[0];
  const newRemainder = remainder.slice(chunk.length);
  const neu = current + chunk;

  textProxy.value = neu;
  nextTick(() => {
    syncMirror();
    autoResizePrompt();
  });

  updateAutocompleteLabel(newRemainder);
  suppressAutocomplete.value = false;
  scheduleStableAutocomplete(neu);
}

/** -------------------------------------------------------------------------
 * Handle suggestion trimming and visibility
 * ------------------------------------------------------------------------- */

const trimmedSuggestion = computed(() => {
  const s = suggestion.value;
  if (!s) return '';
  return s.replace(/^\s+/, ''); // left trim only
});

const hasSuggestion = computed(() => !!trimmedSuggestion.value);

const showHints = computed(() =>
  !props.disabled &&
  !suppressAutocomplete.value &&
  hasSuggestion.value
);

/** ------------------------------------------------------------------------- */

onMounted(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
    syncMirror();
    autoResizePrompt();
  });
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

watch(
  () => props.modelValue,
  () => {
    nextTick(() => {
      syncMirror();
      autoResizePrompt();
    });
  },
  { immediate: true },
);

watch(
  () => props.autocomplete,
  (val) => {
    if (suppressAutocomplete.value) return;

    updateAutocompleteLabel(val || '');

    nextTick(() => {
      syncMirror();
      autoResizePrompt();
    });
  },
  { immediate: false },
);

watch(
  () => store.state.wm.panelWidth.left,
  () => onParentResize(),
);

watch(
  () => store.state.wm.panelWidth.right,
  () => onParentResize(),
);
</script>

<template>
  <div class="chat-console-row">
    <div ref="mirror" class="mirror">
      <span ref="textBeforeCursor"></span>
      <span
        v-if="!suppressAutocomplete && hasSuggestion"
        class="ghost-autocomplete"
      >
        <span
          v-if="trimmedSuggestion"
          class="hint_word"
        >{{ trimmedSuggestion }}</span>
        <span
          v-if="showHints"
          class="tab_complete-hint"
          v-clean-tooltip="'Press Tab to accept full suggestion'"
        >Tab</span>
        <span
          v-if="showHints"
          class="tab_complete-hint"
          v-clean-tooltip="'Press Shift+Tab to accept next word'"
        >Shift+Tab</span>
      </span>
    </div>

    <textarea
      ref="promptTextarea"
      class="chat-input"
      v-model="textProxy"
      :disabled="props.disabled"
      rows="1"
      autocomplete="off"
      @input="handleInput"
      @click="handleClick"
      @scroll="handleScroll"
      @keydown="handleKeydown"
      @keydown.tab.prevent="onTab"
    />

    <div
      class="chat-input-send"
      :class="{ disabled: props.disabled }"
    >
      <slot name="send"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-console-row {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.mirror {
  display: block;
  flex: 1;
  background: transparent;
  pointer-events: none;
  z-index: 10;
  color: transparent;
  padding: 10px;
  margin: 0;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow: hidden;
  min-height: 36px;
  max-height: 90px;
}
.mirror span {
  display: inline;
}

.chat-input {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 1rem;
  outline: none;
  color: var(--input-text);
  transition: border 0.2s;
  outline-offset: 0;
  resize: none;
  overflow: auto;
  width: 100%;
  padding-top: 10px;
  padding-bottom: 10px;
  box-sizing: border-box;
  font-family: monospace;
  line-height: 1.5;
  white-space: pre-wrap;
  min-height: 36px;
  max-height: 90px;
}

.chat-input:focus {
  border: solid 1.5px var(--secondary-border, var(--primary));
}

.chat-input-send {
  flex-shrink: 0;
}

.ghost-autocomplete {
  background-color: transparent;
  color: var(--input-text);
  opacity: 0.3;
  padding: 2px 0;
  border-radius: 3px;
  position: relative;
  top: 1px;
  white-space: pre-wrap;
}

.hint_word {
  white-space: pre-wrap;
}

.tab_complete-hint {
  color: var(--input-text);
  opacity: 0.8;
  position: relative;
  border: 1px solid var(--input-text);
  border-radius: 4px;
  font-size: 10px;
  background-color: var(--input-placeholder);
  white-space: nowrap;
  padding: 2px 4px;
  margin-left: 2px;
  cursor: default;
  pointer-events: all;
  z-index: 100;
}
</style>

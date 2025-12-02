<script setup lang="ts">
import {
  ref,
  computed,
  defineProps,
  defineEmits,
  nextTick,
  onMounted,
  watch,
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
  // backend-sent autocomplete *suffix*
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
const floatingLabel = ref<HTMLSpanElement | null>(null);

// 🔥 gate showing autocomplete until input is stable
const suppressAutocomplete = ref(true);

// v-model proxy
const textProxy = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
});

// ⬇⬇⬇ FLIPPED: ghost drives size, textarea follows
function autoResizePrompt() {
  const textarea = promptTextarea.value;
  const ghost = mirror.value;
  if (!textarea || !ghost) return;

  // let ghost grow naturally first
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
  if (floatingLabel.value) {
    floatingLabel.value.textContent = value;
  }
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

  // keep scroll in sync
  ghost.scrollTop = textarea.scrollTop;

  // ⬇⬇⬇ FLIPPED: textarea width follows ghost
  textarea.style.width = `${ghost.offsetWidth}px`;
}

/**
 * Debounced "input is stable" signal.
 * After this delay, we:
 *  - unsuppress autocomplete
 *  - ask backend for a suggestion
 */
const scheduleStableAutocomplete = debounce((prompt: string) => {
  suppressAutocomplete.value = false;           // 🔓 allow showing autocomplete
  emit('fetch:autocomplete', prompt);          // ask backend now
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

    // User changed text -> schedule autocomplete for stable input
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
  // Any printable key OR Backspace/Delete means "user is actively editing"
  if (
    event.key.length === 1 ||          // characters
    event.key === 'Backspace' ||
    event.key === 'Delete'
  ) {
    // User typing → hide current suggestion and suppress new ones
    suppressAutocomplete.value = true;    // 🚫 block showing autocomplete
    scheduleStableAutocomplete.cancel?.(); // cancel pending stable trigger, if any
    updateAutocompleteLabel('');          // clear label instantly
  }

  // Submit on Enter (but not Shift+Enter)
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('submit');
    return;
  }
}

function onParentResize() {
  // recalc layout
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

  const labelText = floatingLabel.value?.textContent || '';
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

    updateAutocompleteLabel(''); // suggestion consumed

    // treated as stable, so we can fetch new suggestion for full text
    suppressAutocomplete.value = false;
    scheduleStableAutocomplete(neu); // reuse same debounce

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

// lifecycle
onMounted(() => {
  nextTick(() => {
    promptTextarea.value?.focus();
    syncMirror();
    autoResizePrompt();
  });
});

// resize & mirror when external model changes (e.g. we accept autocomplete)
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

// ❗ ONLY place where backend autocomplete gets applied to label.
watch(
  () => props.autocomplete,
  (val) => {
    // if user is still typing or we haven't reached stable input delay, don't show
    if (suppressAutocomplete.value) return;

    updateAutocompleteLabel(val || '');

    // ⬇⬇⬇ autocomplete can change ghost height → resize
    nextTick(() => {
      syncMirror();
      autoResizePrompt();
    });
  },
  { immediate: false },
);

watch(
  () => store.state.wm.panelWidth.left,
  () => onParentResize()
);

watch(
  () => store.state.wm.panelWidth.right,
  () => onParentResize()
);
</script>

<template>
  <div class="chat-console-row">
    <div ref="mirror" class="mirror">
      <span ref="textBeforeCursor"></span>
      <span ref="floatingLabel" class="floating-label"></span>
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

    <div class="chat-input-send" :class="{ disabled: props.disabled }">
      <slot name="send"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chat-console-row {
  position: relative;
  display: flex;
  align-items: end;
  gap: 8px;
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

  // ⬇⬇⬇ match mirror’s width
  width: 100%;
}

.chat-input:focus {
  border: solid 1.5px var(--secondary-border, var(--primary));
}

.chat-input,
.mirror {
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

.mirror {
  flex: 1;
  background: transparent;
  pointer-events: none;
  z-index: 10;
  color: transparent;
}

.floating-label {
  background-color: transparent;
  color: var(--input-text);
  opacity: 0.3;
  padding: 2px 0;
  border-radius: 3px;
  position: relative;
  top: 1px;
  margin-left: -8px;
}
</style>

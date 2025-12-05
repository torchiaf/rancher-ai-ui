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
  chatCnt: {
    type:     Number,
    required: true,
  },
  modelValue: {
    type:    String,
    default: '',
  },
  disabled: {
    type:    Boolean,
    default: false,
  },
  autocomplete: {
    type:    String,
    default: '',
  },
  autocompleteItems: {
    type:    Array as () => any[],
    default: () => [],
  },
  autocompleteItemsLoading: {
    type:    Boolean,
    default: true,
  },
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
  (e: 'fetch:autocomplete', args: { prompt: string, wildcard: string | undefined }): void;
}>();

const lastPrompt = ref('');
const lastAutocomplete = ref('');

const promptTextarea = ref<HTMLTextAreaElement | null>(null);
const mirror = ref<HTMLDivElement | null>(null);
const textBeforeCursor = ref<HTMLSpanElement | null>(null);

const suggestion = ref('');

const suppressAutocomplete = ref(true);

// @ mention dropdown state
const showMentionDropdown = ref(false);
const mentionPosition = ref({
  top:  0,
  left: 0
});
const mentionQuery = ref('');
const selectedMentionIndex = ref(0);

const filteredMentionItems = computed(() => {
  const mentionItems = props.autocompleteItems.map((item: any, index: number) => ({
    id:      index,
    label:   item.name,
    value:   item.name,
    tooltip: item.name.length > 32 ? `Name: ${ item.name } Type: ${ item.type }` : null,
  }));

  if (!mentionQuery.value) {
    return mentionItems;
  }
  const query = mentionQuery.value.toLowerCase();

  return mentionItems.filter((item) => item.value.toLowerCase().includes(query)
  );
});

const textProxy = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
});

function normalizeForCompare(s: string): string {
  // remove leading/trailing spaces & CRLF for comparison only
  return s.replace(/\r?\n/g, ' ').trim();
}

function autoResizePrompt() {
  const textarea = promptTextarea.value;
  const ghost = mirror.value;

  if (!textarea || !ghost) {
    return;
  }

  ghost.style.height = 'auto';

  const rawHeight = ghost.scrollHeight || 0;
  const min = 36;
  const max = 90;
  const targetHeight = Math.min(Math.max(rawHeight, min), max);

  ghost.style.height = `${ targetHeight }px`;
  textarea.style.height = `${ targetHeight }px`;
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

  if (!textarea || !ghost) {
    return;
  }

  const cursorPos = textarea.value.length;
  const textValue = textarea.value;

  updateTextBeforeCursor(textValue.substring(0, cursorPos));

  ghost.scrollTop = textarea.scrollTop;
  textarea.style.width = `${ ghost.offsetWidth }px`;
}

/**
 * Check for @ mention trigger and show dropdown
 */
function checkMentionTrigger() {
  const textarea = promptTextarea.value;

  if (!textarea) {
    return;
  }

  const cursorPos = textarea.selectionStart;
  const text = textarea.value;

  // Find the last @ before cursor
  let lastAtPos = -1;

  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      // Check if @ is at start or preceded by whitespace
      if (i === 0 || /\s/.test(text[i - 1])) {
        lastAtPos = i;
        break;
      }
    } else if (/\s/.test(text[i])) {
      // Stop at whitespace
      break;
    }
  }

  if (lastAtPos !== -1) {
    // Extract query after @
    const query = text.substring(lastAtPos + 1, cursorPos);

    mentionQuery.value = query;

    // Calculate position for dropdown
    const rect = textarea.getBoundingClientRect();

    mentionPosition.value = {
      top:  rect.top - 10, // Position above textarea
      left: rect.left,
    };

    showMentionDropdown.value = true;
    selectedMentionIndex.value = 0; // Reset selection when opening
  } else {
    showMentionDropdown.value = false;
    mentionQuery.value = '';
    selectedMentionIndex.value = 0;
  }
}

/**
 * Insert selected mention item
 */
function selectMentionItem(item: any) {
  const textarea = promptTextarea.value;

  if (!textarea) {
    return;
  }

  const cursorPos = textarea.selectionStart;
  const text = textarea.value;

  // Find the @ position
  let atPos = -1;

  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      if (i === 0 || /\s/.test(text[i - 1])) {
        atPos = i;
        break;
      }
    } else if (/\s/.test(text[i])) {
      break;
    }
  }

  if (atPos !== -1) {
    // Replace @query with selected value
    const newText = `${ text.substring(0, atPos) + item.value  } ${  text.substring(cursorPos) }`;

    textProxy.value = newText;

    nextTick(() => {
      // Set cursor after inserted mention
      const newCursorPos = atPos + item.value.length + 1;

      textarea.setSelectionRange(newCursorPos, newCursorPos);
      syncMirror();
      autoResizePrompt();
    });
  }

  showMentionDropdown.value = false;
  mentionQuery.value = '';
  selectedMentionIndex.value = 0;
}

/**
 * Debounced "input is stable" signal.
 */
const scheduleStableAutocomplete = debounce((rawPrompt: string) => {
  const cmpPrompt = normalizeForCompare(rawPrompt);

  // 1. must be >= 3 visible chars
  if (cmpPrompt.length < 3) {
    return;
  }

  // 2. must differ from previous cmp prompt
  if (cmpPrompt === lastPrompt.value) {
    return;
  }

  // 3. user manually typed exact last suggestion
  if (
    lastAutocomplete.value &&
    cmpPrompt.endsWith(lastAutocomplete.value.trim())
  ) {
    return;
  }

  // 4. avoid to re-fetch if @ mention is present and the new mention is incremental
  if (
    cmpPrompt.includes('@') &&
    cmpPrompt.includes(lastPrompt.value) &&
    cmpPrompt.length >= lastPrompt.value.length &&
    props.autocompleteItems.length > 0
  ) {
    return;
  }

  suppressAutocomplete.value = false;

  // store normalized for comparison only
  lastPrompt.value = cmpPrompt;

  // send RAW prompt - do NOT trim!
  emit('fetch:autocomplete', {
    prompt:   rawPrompt,
    wildcard: rawPrompt.includes('@') ? '@' : undefined
  });
}, 500);

/**
 * On every input:
 * - Resize
 * - Sync cursor/mirror
 * - Schedule autocomplete fetch once input is stable
 * - Check for @ mention trigger
 */
function handleInput() {
  nextTick(() => {
    syncMirror();
    autoResizePrompt();
    scheduleStableAutocomplete(textProxy.value);
    checkMentionTrigger();
  });
}

function handleClick() {
  syncMirror();
  checkMentionTrigger();
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
 * - Escape to close mention dropdown
 * - Arrow keys for mention dropdown navigation
 */
function handleKeydown(event: KeyboardEvent) {
  // Handle mention dropdown navigation
  if (showMentionDropdown.value) {
    if (event.key === 'Escape') {
      event.preventDefault();
      showMentionDropdown.value = false;
      mentionQuery.value = '';
      selectedMentionIndex.value = 0;

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedMentionIndex.value = Math.min(
        selectedMentionIndex.value + 1,
        filteredMentionItems.value.length - 1
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0);

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredMentionItems.value[selectedMentionIndex.value]) {
        selectMentionItem(filteredMentionItems.value[selectedMentionIndex.value]);
      }

      return;
    }
  }

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
    suppressAutocomplete.value = true;
    scheduleStableAutocomplete.cancel?.();

    if (showMentionDropdown.value) {
      // Don't submit if dropdown is open
      return;
    }

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

  if (!labelText) {
    return;
  }

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

    // DO NOT re-fetch autocomplete here
    // suppressAutocomplete stays as-is

    return;
  }

  // SHIFT+TAB → accept next word only
  const remainder = labelText;
  const match = remainder.match(/^\s*\S+(\s*)?/);

  if (!match) {
    return;
  }

  const chunk = match[0];
  const newRemainder = remainder.slice(chunk.length);
  const neu = current + chunk;

  textProxy.value = neu;
  nextTick(() => {
    syncMirror();
    autoResizePrompt();
  });

  updateAutocompleteLabel(newRemainder);
  // DO NOT re-fetch autocomplete here
}

/** -------------------------------------------------------------------------
 * Handle suggestion trimming and visibility
 * ------------------------------------------------------------------------- */

const trimmedSuggestion = computed(() => {
  const s = suggestion.value;

  if (!s) {
    return '';
  }

  return s.replace(/^\s+/, ''); // left trim only
});

const hasSuggestion = computed(() => !!trimmedSuggestion.value);

const showHints = computed(() => !props.disabled &&
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
    if (suppressAutocomplete.value) {
      return;
    }

    lastAutocomplete.value = val?.trim() || ''; // track
    updateAutocompleteLabel(val || '');

    nextTick(() => {
      syncMirror();
      autoResizePrompt();
    });
  },
);

watch(
  () => store.state.wm.panelWidth.left,
  () => onParentResize(),
);

watch(
  () => store.state.wm.panelWidth.right,
  () => onParentResize(),
);

watch(
  () => props.chatCnt,
  () => {
    emit('update:modelValue', '');
    textProxy.value = '';
  },
  { immediate: true },
);

// Reset selection when filtered items change
watch(filteredMentionItems, () => {
  if (selectedMentionIndex.value >= filteredMentionItems.value.length) {
    selectedMentionIndex.value = Math.max(0, filteredMentionItems.value.length - 1);
  }
});
</script>

<template>
  <div class="chat-console-row">
    <div
      ref="mirror"
      class="mirror"
    >
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
          v-clean-tooltip="'Press Tab to accept full suggestion'"
          class="tab_complete-hint"
        >Tab</span>
        <span
          v-if="showHints"
          v-clean-tooltip="'Press Shift+Tab to accept next word'"
          class="tab_complete-hint"
        >
          <span class="arrow-icon">⇧</span>+Tab
        </span>
      </span>
    </div>

    <textarea
      ref="promptTextarea"
      v-model="textProxy"
      class="chat-input"
      :disabled="props.disabled"
      rows="1"
      autocomplete="off"
      @input="handleInput"
      @click="handleClick"
      @scroll="handleScroll"
      @keydown="handleKeydown"
      @keydown.tab.prevent="onTab"
    />

    <!-- @ Mention Dropdown -->
    <div
      v-if="showMentionDropdown && !props.autocompleteItemsLoading"
      class="mention-dropdown"
      :style="{
        top: `${mentionPosition.top}px`,
        left: `${mentionPosition.left}px`,
      }"
    >
      <div class="mention-dropdown-content">
        <template v-if="filteredMentionItems.length > 0">
          <div
            v-for="(item, index) in filteredMentionItems"
            :key="item.id"
            class="mention-item"
            :class="{ selected: index === selectedMentionIndex }"
            @click="selectMentionItem(item)"
            @mouseenter="selectedMentionIndex = index"
          >
            <span v-clean-tooltip="item.tooltip">
              {{ item.label }}
            </span>
          </div>
        </template>
        <template v-else>
          <div class="mention-item mention-no-results">
            No results found
          </div>
        </template>
      </div>
    </div>

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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.arrow-icon {
  font-size: 1.4em;
  line-height: 1;
  display: inline-block;
  opacity: 1;
  font-weight: 900;
  -webkit-text-stroke: 0.5px currentColor;
  text-shadow: 0 0 0.5px currentColor, 0 0 0.5px currentColor;
}

/* @ Mention Dropdown Styles */
.mention-dropdown {
  position: fixed;
  z-index: 1000;
  transform: translateY(-100%);
  margin-bottom: 8px;
  max-width: 300px;
  min-width: 200px;
}

.mention-dropdown-content {
  background: var(--dropdown-bg, var(--body-bg));
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
}

.mention-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--body-text);
  transition: background-color 0.2s;

  &:hover,
  &.selected {
    color: var(--link);
    background-color: var(--dropdown-hover-bg, var(--wm-closer-default));
  }

  .icon {
    flex-shrink: 0;
  }

  span {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.mention-no-results {
  cursor: default;
  opacity: 0.6;
  font-style: italic;

  &:hover {
    background-color: transparent;
  }
}
</style>

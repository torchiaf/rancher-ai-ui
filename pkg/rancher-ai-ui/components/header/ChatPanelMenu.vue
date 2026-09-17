<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';
import { StorageKey } from '../../types';
import { useLocalStorageComposable } from '../../composables/useLocalStorageComposable';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'download:chat',
  'show:help',
  'config:chat',
  'shortcuts:chat',
  'toggle:autoscroll',
]);

const storage = useLocalStorageComposable();

const isAutoscrollEnabled = computed(() => {
  const value = storage.get(StorageKey.ENABLE_AUTO_SCROLL);

  return value === 'true' || value === true;
});

const options = computed(() => [
  {
    label:       t('ai.menu.options.chat.download.label'),
    description: t('ai.menu.options.chat.download.description'),
    icon:        'icon-download',
    action:      () => {
      emit('download:chat');
    },
  },
  {
    label:       t(`ai.menu.options.chat.autoscroll.label.${ isAutoscrollEnabled.value ? 'disable' : 'enable' }`),
    description: t(`ai.menu.options.chat.autoscroll.description.${ isAutoscrollEnabled.value ? 'disable' : 'enable' }`),
    icon:        isAutoscrollEnabled.value ? 'icon-pause' : 'icon-play',
    action:      () => {
      storage.set(StorageKey.ENABLE_AUTO_SCROLL, !isAutoscrollEnabled.value);
    },
  },
  {
    label:       t('ai.menu.options.chat.shortcuts.label'),
    description: t('ai.menu.options.chat.shortcuts.description'),
    icon:        'icon-keyboard',
    action:      () => {
      emit('shortcuts:chat');
    },
  },
  {
    label:       t('ai.menu.options.chat.config.label'),
    description: t('ai.menu.options.chat.config.description'),
    icon:        'icon-gear',
    action:      () => {
      emit('config:chat');
    },
  },
]);

const isOpen = ref(false);
</script>

<template>
  <div class="chat-console-menu-container">
    <rc-dropdown
      placement="top-end"
      @update:open="isOpen = $event"
    >
      <rc-dropdown-trigger
        variant="ghost"
        small
        :disabled="props.disabled"
      >
        <i class="icon icon-actions" />
      </rc-dropdown-trigger>
      <template #dropdownCollection>
        <rc-dropdown-item
          v-for="(opt, i) in options"
          :key="i"
          v-clean-tooltip="opt.description"
          @click="opt.action"
        >
          {{ opt.label }}
          <template
            #before
          >
            <i
              v-if="opt.icon"
              class="icon"
              :class="opt.icon"
            />
          </template>
        </rc-dropdown-item>
      </template>
    </rc-dropdown>
  </div>
</template>

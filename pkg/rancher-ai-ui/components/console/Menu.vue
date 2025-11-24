<script setup lang="ts">
import { ref } from 'vue';
import { useStore } from 'vuex';
import {
  RcDropdown,
  RcDropdownTrigger,
  RcDropdownItem,
} from '@components/RcDropdown';

const store = useStore();
const t = store.getters['i18n/t'];

const props = defineProps({
  disabled: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'download:chat',
  'reset:chat',
  'show:help',
  'config:chat'
]);

const options = ref([
  {
    label:       t('ai.options.chat.download.label'),
    description: t('ai.options.chat.download.description'),
    icon:        'icon-download',
    action:      () => {
      emit('download:chat');
    },
  },
  {
    label:       t('ai.options.chat.reset.label'),
    description: t('ai.options.chat.reset.description'),
    icon:        'icon-backup',
    action:      () => {
      emit('reset:chat');
    },
  },
  {
    label:       t('ai.options.chat.config.label'),
    description: t('ai.options.chat.config.description'),
    icon:        'icon-gear',
    action:      () => {
      emit('config:chat');
    },
  },
  // {
  //   label: t('ai.options.chat.help.label'),
  //   description: t('ai.options.chat.help.description'),
  //   icon:  'icon-question-mark',
  //   action: () => {
  //     emit('show:help');
  //   },
  // }
]);

async function handleMenuOpen(open: boolean) {
  if (open) {
    const chatsData = await fetch('/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-chat:80/proxy/chats');

    const dataChatsJson = await chatsData.json();

    console.log('Fetched chats on menu open:', dataChatsJson);

    chats.value = dataChatsJson;

    for (const chat of dataChatsJson) {
      const messagesData = await fetch(`/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-chat:80/proxy/chats/${ chat.chat_id }/messages`);

      const dataMessagesJson = await messagesData.json();

      console.log('Fetched messages on menu open:', dataMessagesJson);
    }
  }

  isOpen.value = open;
}

const isOpen = ref(false);
const chats = ref<Array<any>>([]);
</script>

<template>
  <div class="chat-console-menu-container">
    <rc-dropdown
      class="menu-dropdown"
      placement="top-end"
      @update:open="handleMenuOpen"
    >
      <rc-dropdown-trigger
        ghost
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
        <rc-dropdown-item
          v-for="chat in chats"
          :key="chat.id"
        >
          <div>
            chat: {{ chat.name || chat.id }}
          </div>
        </rc-dropdown-item>
      </template>
    </rc-dropdown>
  </div>
</template>

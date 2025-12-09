<script setup lang="ts">
import { ref, computed } from 'vue';
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

const chats = ref<Array<any>>([]);

const filteredChats = computed(() => {
  return chats.value.filter((chat) => !!chat.name);
});

async function handleMenuOpen(open: boolean) {
  if (open) {
    const chatsData = await fetch('/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-chat:80/proxy/chats?min-messages=2');

    chats.value = await chatsData.json();
  }

  isOpen.value = open;
}

async function showChatInfo(chat: any) {
  const messagesData = await fetch(`/api/v1/namespaces/cattle-ai-agent-system/services/http:rancher-ai-chat:80/proxy/chats/${ chat.chat_id }/messages`);

  const dataMessagesJson: {
    message: string;
    role:    string;
    created_at: string;
  }[] = await messagesData.json();

  const formattedMessages = dataMessagesJson
    .sort((a, b) => Number(a.created_at) - Number(b.created_at))
    .map((msg) => `[${ msg.role }]: ${ msg.message.slice(0, 50) } ${ msg.message.length > 50 ? '...' : '' }`)
    .join('\n');

  alert(`Messages: \n\n${ formattedMessages }`);
}

const isOpen = ref(false);

const MAX_VISIBLE_CHATS = 10;

const shouldShowScroll = computed(() => chats.value.length > MAX_VISIBLE_CHATS);
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
        <div v-if="filteredChats.length">
          <hr class="dropdown-divider" />
          <div class="dropdown-header">
            Chat History
          </div>
          <div
            class="chats-container"
            :class="{ 'has-scroll': shouldShowScroll }"
          >
            <rc-dropdown-item
              v-for="chat in filteredChats"
              :key="chat.id"
              @click="showChatInfo(chat)"
            >
              <div>
                {{ chat.name || chat.id }}
              </div>
            </rc-dropdown-item>
          </div>
        </div>
      </template>
    </rc-dropdown>
  </div>
</template>

<style lang="scss" scoped>
.dropdown-divider {
  margin: 8px 0;
}
.dropdown-header {
  font-size:    0.85rem;
  font-weight:  600;
  color:        var(--rc-color-text-secondary);
  padding:      0 1rem;
  text-transform: uppercase;
  margin: 16px 0 8px 0;
}

.chats-container {
  &.has-scroll {
    max-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
      border-radius: 4px;

      &:hover {
        background: var(--scrollbar-thumb-hover, rgba(0, 0, 0, 0.3));
      }
    }
  }
}
</style>

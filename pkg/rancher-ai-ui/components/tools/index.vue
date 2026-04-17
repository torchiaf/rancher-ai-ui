<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import {
  type PropType, computed, defineAsyncComponent, onMounted, ref
} from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { Message } from '../../types';
import { warn } from '../../utils/log';
// TODO this will be removed !!!

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  label: {
    type:    String,
    default: '',
  },
});

const toolComponents = ref<Record<string, any>>({});

const tools = computed(() => {
  const all = props.message.tools || [];

  console.log('All tools from message:', props.message.tools);

  // TODO temporary filter tools managed elsewhere
  return all.filter((tool) => {
    return tool.toolName !== 'select-option' && tool.toolName !== 'suggestions';
  });
});

async function loadToolComponents() {
  const loaderPromises = tools.value.map(async({ toolName: name }) => {
    const path = upperFirst(camelCase(name));

    try {
      await import(`./${ path }.vue`);

      const component = defineAsyncComponent(() => import(`./${ path }.vue`));

      return {
        name,
        component
      };
    } catch (error) {
      warn(`Tool component not found: ${ path }.vue`, error);

      return { name };
    }
  });

  const all = await Promise.all(loaderPromises);

  all.forEach(({ name, component }) => {
    if (component) {
      toolComponents.value[name] = component;
    }
  });
}

const emit = defineEmits([]);

onMounted(() => {
  loadToolComponents();
});
</script>

<template>
  <div
    v-if="Object.values(toolComponents).length"
    class="chat-tools-container"
  >
    <div class="chat-msg-tools-title">
      <span>{{ props.label || 'TOOLS' }}</span>
    </div>
    <div class="chat-msg-tools-container">
      <div class="chat-msg-tool-tags">
        <template
          v-for="(tool, index) in tools"
          :key="index"
        >
          <div
            v-if="toolComponents[tool.toolName]"
            class="mt-2 chat-msg-tools"
          >
            <component
              :is="toolComponents[tool.toolName]"
              :message="props.message"
              :tool="tool"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang='scss' scoped>
.chat-msg-tools-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--on-secondary);

  span {
    font: 9px sans-serif;
    font-weight: 500;
  }
}

.chat-msg-tools-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-msg-tool-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.chat-msg-tools {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.chat-msg-tools-more {
  color: #94a3b8;
  cursor: pointer;
}
</style>

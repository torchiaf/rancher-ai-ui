<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import {
  type PropType, computed, defineAsyncComponent, ref
} from 'vue';
import { Message } from '../../types';
import { ToolName } from './types';

const props = defineProps({
  name: {
    type:    String,
    default: '',
  },
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
});

const tool = computed(() => {
  // We don't want to show the suggestions tool if the select-option tool is present
  if (props.name === ToolName.Suggestions && props.message.tools?.find((t) => t.toolName === ToolName.SelectOption)) {
    return null;
  }

  return props.message.tools?.find((t) => t.toolName === props.name) || null;
});

const componentCache = ref<any>(null);

const component = computed(() => {
  if (!tool.value) {
    return null;
  }

  if (componentCache.value) {
    return componentCache.value;
  }

  const path = upperFirst(camelCase(props.name));

  try {
    componentCache.value = defineAsyncComponent(() => import(`./${ path }.vue`));
    return componentCache.value;
  } catch (error) {
    console.warn(`Tool component not found: ${ path }.vue`, error);
    return null;
  }
});

const emit = defineEmits(['action']);
</script>

<template>
  <div v-if="component">
    <component
      :is="component"
      :tool="tool"
      :message="props.message"
      @action="emit('action', $event)"
    />
  </div>
</template>

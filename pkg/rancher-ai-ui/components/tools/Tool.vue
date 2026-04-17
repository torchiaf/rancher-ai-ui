<script setup lang="ts">
import { camelCase, upperFirst } from 'lodash';
import {
  type PropType, computed, defineAsyncComponent, ref, watch
} from 'vue';
import { Message } from '../../types';
import { ToolName } from './types';
import { warn } from '../../utils/log';

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

const component = ref<any>(null);

watch(() => tool.value, (newTool) => {
  if (!newTool) {
    component.value = null;

    return;
  }

  if (component.value) {
    return;
  }

  const path = upperFirst(camelCase(props.name));

  try {
    component.value = defineAsyncComponent(() => import(`./${ path }.vue`));
  } catch (error) {
    warn(`Tool component not found: ${ path }.vue`, error);
  }
}, { immediate: true });

const emit = defineEmits(['action']);
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :tool="tool"
    :message="props.message"
    @action="emit('action', $event)"
  />
</template>

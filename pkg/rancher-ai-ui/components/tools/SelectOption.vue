<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { ToolCall } from '../../types';
import ListOptions from '../../components/ListOptions.vue';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => ({} as ToolCall),
  },
});

const emit = defineEmits(['action']);

const options = computed(() => {
  const opts = [];

  if (props.tool.input.option1) {
    opts.push(props.tool.input.option1);
  }
  if (props.tool.input.option2) {
    opts.push(props.tool.input.option2);
  }
  if (props.tool.input.option3) {
    opts.push(props.tool.input.option3);
  }

  return opts;
});
</script>

<template>
  <ListOptions
    :label="props.tool.input.label || t(`aiConfig.form.section.tools.fields.tools.name.${props.tool.toolName}`, {}, true)"
    :options="options"
    @select="emit('action', { type: 'select', value: $event })"
  />
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { PRODUCT_NAME } from '../../product';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { ToolAction } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolAction>,
    default: () => {},
  },
});

const label = computed(() => {
  return props.tool.input.label || t(`aiConfig.form.section.tools.fields.tools.name.${ props.tool.toolName }`, {}, true) || props.tool.toolName;
});

function navigateToRoute() {
  // TODO validate path
  store.state.$router.push(props.tool.input.path);
}

</script>

<template>
  <div>
    <RcButton
      small
      secondary
      @click="navigateToRoute"
    >
      <span class="rc-button-label">
        {{ label }}
      </span>
    </RcButton>
  </div>
</template>

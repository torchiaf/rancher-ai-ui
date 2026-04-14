<script setup lang="ts">
import { type PropType } from 'vue';
import { useStore } from 'vuex';
import { PRODUCT_NAME } from '../../product';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { EditorMode, Message, ToolAction } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  message: {
    type:    Object as PropType<Message>,
    default: () => ({} as Message),
  },
  tool: {
    type:    Object as PropType<ToolAction>,
    default: () => {},
  },
});

function navigateToStagingWithYaml() {
  const {
    yaml,
    resourceKind,
    resourceNamespace,
    resourceName,
    title
  } = props.tool.input;

  if (!yaml || !resourceKind || !resourceName || !resourceNamespace) {
    console.warn('Missing YAML content for ShowYamlDiff tool:', props.tool.input);

    return;
  }

  // Save YAML to staging store
  store.commit(`${ PRODUCT_NAME }/staging/setStagingData`, {
    original: '',
    patched:     yaml,
    resource:       {
      kind:      resourceKind,
      namespace: resourceNamespace,
      name:      resourceName
    },
    title,
    sourceMessage: props.message
  });

  store.commit(`${ PRODUCT_NAME }/staging/setEditorMode`, EditorMode.VIEW_CODE);

  // Navigate to staging page with a timestamp to force route update even if params are identical
  store.state.$router.push({
    name:   `c-cluster-${ PRODUCT_NAME }-staging`,
    params: {
      cluster: 'local',
      product: 'explorer',
    },
    query: { t: Date.now() }
  });
}

</script>

<template>
  <div>
    <RcButton
      small
      secondary
      @click="navigateToStagingWithYaml"
    >
      <span class="rc-button-label">
        {{ t(`aiConfig.form.section.tools.fields.tools.name.${props.tool.toolName}`, {}, true) || props.tool.toolName }}
      </span>
    </RcButton>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type PropType } from 'vue';
import { useStore } from 'vuex';
import { warn } from '../../utils/log';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { ToolCall } from '../../types';

const store = useStore();
const { t } = useI18n(store);

const inStore = 'management';
const POD_TYPE = 'pod';

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => {},
  },
});

const pod = computed(() => {
  const { cluster, namespace, name } = props.tool.input || {};

  if (!cluster || !namespace || !name) {
    return null;
  }

  const id = `${ namespace }/${ name }`;

  return store.getters[`${ inStore }/byId`](POD_TYPE, id);
});

function openConsoleLogs() {
  const containerName = pod.value?.spec?.containers?.[0]?.name; // TODO fix the tool to get the exact container name

  console.log('Opening logs for container:', props.tool.input, 'containerName:', containerName, 'in pod:', pod.value);

  store.dispatch('wm/open', {
    id:        `${ containerName }-logs`,
    label:     pod.value?.metadata?.name,
    icon:      'file',
    component: 'ContainerLogs',
    attrs:     {
      pod,
      initialContainer: containerName
    }
  }, { root: true });
}

onMounted(async() => {
  await store.dispatch('loadManagement');

  const {
    cluster, type = POD_TYPE, namespace, name
  } = props.tool.input || {};

  try {
    const id = `${ namespace }/${ name }`;

    if (cluster === 'local') {
      await store.dispatch(`${ inStore }/find`, {
        cluster,
        type,
        id,
      });
    } else {
      const url = `/k8s/clusters/${ cluster }/v1`;

      const data = await store.dispatch(`${ inStore }/request`, { url: `${ url }/${ type }s/${ id }?exclude=metadata.managedFields` });

      // Convert to model and store in cache
      await store.dispatch(`${ inStore }/load`, {
        data,
        invalidatePageCache: false
      });
    }
  } catch (e) {
    warn(`Action - Could not find resource with { cluster: ${ cluster }, type: ${ type }, name: ${ name }, namespace: ${ namespace } }`, e);
  }
});

</script>

<template>
  <div v-if="!!pod">
    <RcButton
      small
      secondary
      @click="() => openConsoleLogs()"
    >
      <span class="rc-button-label">
        {{ t(`aiConfig.form.section.tools.fields.tools.name.${props.tool.toolName}`, {}, true) || props.tool.toolName }}
      </span>
    </RcButton>
  </div>
</template>

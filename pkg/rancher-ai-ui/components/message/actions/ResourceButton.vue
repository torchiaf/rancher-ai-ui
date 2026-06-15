<script setup lang="ts">
import { computed, onMounted, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { STORE } from '@shell/store/store-types';
import { warn } from '../../../utils/log';
import { convertToManagementType } from '../../../utils/schema';
import RcButton from '@components/RcButton/RcButton.vue';
import { MessageAction } from '../../../types';
import { ActionType } from '../../../types';

const store = useStore();
const { t } = useI18n(store);

const rancherStores = [STORE.MANAGEMENT, STORE.CLUSTER, STORE.RANCHER];

const props = defineProps({
  value: {
    type:    Object as PropType<MessageAction>,
    default: () => ({} as MessageAction),
  }
});

const inStore = computed(() => {
  const productStore = store.getters['currentProduct'].inStore;

  // We want to use management for Rancher resources, otherwise use the real product store (e.g. harvester)
  if (rancherStores.includes(productStore)) {
    return STORE.MANAGEMENT;
  }

  return productStore;
});

const isManagementProduct = computed(() => inStore.value === STORE.MANAGEMENT);

const to = computed(() => {
  if (props.value.resource?.detailLocation) {
    return props.value.resource;
  }

  const { type, namespace, name } = props.value.resource || {};

  const normalizedType = normalizeType(type);
  const id = namespace ? `${ namespace }/${ name }` : name;

  return store.getters[`${ inStore.value }/byId`](normalizedType, id);
});

const label = computed(() => {
  if (props.value.label) {
    return props.value.label;
  }

  return t(`ai.message.actions.label`, {
    kind: to.value ? to.value.kind : props.value.resource?.kind || '',
    name: to.value ? (to.value.nameDisplay || to.value.name) : props.value.resource?.name || ''
  }, true);
});

function goTo() {
  if (to.value.detailLocation) {
    const params = to.value.detailLocation.params || {};

    store.state.$router.push({
      ...to.value.detailLocation,
      params: {
        ...params,
        product: params.product || 'explorer',
        cluster: props.value?.resource?.cluster || params?.cluster,
      }
    });
  }
}

function normalizeType(type?: string) {
  if (isManagementProduct.value) {
    return convertToManagementType(type || '');
  }

  return type;
}

onMounted(async() => {
  if (!!props.value.resource?.detailLocation || !!to.value) {
    return;
  }

  if (isManagementProduct.value) {
    await store.dispatch('loadManagement');
  }

  const {
    cluster, type, namespace, name
  } = props.value.resource || {};

  try {
    const normalizedType = normalizeType(type);
    const id = namespace ? `${ namespace }/${ name }` : name;

    if (cluster === 'local') {
      await store.dispatch(`${ inStore.value }/find`, {
        cluster,
        type: normalizedType,
        id,
      });
    } else {
      const url = `/k8s/clusters/${ cluster }/v1`;

      const data = await store.dispatch(`${ inStore.value }/request`, { url: `${ url }/${ normalizedType }s/${ id }?exclude=metadata.managedFields` });

      // Convert to model and store in cache
      await store.dispatch(`${ inStore.value }/load`, {
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
  <div
    v-if="props.value.type === ActionType.Button"
    :data-testid="`rancher-ai-ui-chat-message-action-button-${ props.value?.resource?.name }`"
  >
    <RcButton
      small
      variant="secondary"
      :disabled="!to"
      @click="goTo"
    >
      <span class="rc-button-label">
        {{ label }}
      </span>
    </RcButton>
  </div>
  <span v-if="props.value.type === ActionType.Link">
    <a
      v-if="to"
      class="link"
      @click="goTo"
    >
      {{ label }}
    </a>
    <span v-else>
      {{ label }}
      <template v-if="!props.value">
        <span class="text-muted">&mdash;</span>
      </template>
    </span>
  </span>
</template>

<style lang='scss' scoped>
.rc-button-label {
  word-break: break-word;
  white-space: pre-line;
  list-style-position: inside;
}
.link {
  cursor: pointer;
}
</style>
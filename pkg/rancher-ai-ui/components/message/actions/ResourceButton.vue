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

// TODO fleet not working, is taking auth as product

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
  const { type } = props.value.resource || {};
  const resourceType = normalizeType(type) || '';

  const activeProducts = store.getters['type-map/activeProducts'];

  for (const product of activeProducts) {
    if (product.inExplorer) {
      continue;
    }

    const allTypes = store.getters['type-map/allTypes'](product.name)?.['all'] || {};

    console.log('----- routers', store.state.$router.getRoutes());

    console.log('--- TYPES', allTypes, product.name, resourceType, !!allTypes[resourceType]);

    if (allTypes[resourceType]) {
      console.log('--- Found resource type in product:', product);

      return product.inStore;
    }
  }

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

  console.log('--- Looking for resource in store:', {
    inStore: inStore.value,
    type:    normalizedType,
    id
  });

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
    console.log('--- Navigating to:', to.value.detailLocation);

    store.state.$router.push(to.value.detailLocation);
  }
}

function normalizeType(type?: string) {
  if (isManagementProduct.value) {
    return convertToManagementType(type || '');
  }

  return type;
}

function findProductForResourceType(type: string) {
  const activeProducts = store.getters['type-map/activeProducts'];

  for (const product of activeProducts) {
    if (product.inExplorer) {
      continue;
    }

    const allTypes = store.getters['type-map/allTypes'](product.name)?.['all'] || {};

    if (allTypes[type]) {
      return product;
    }
  }

  // Fallback to current product
  return store.getters['currentProduct'];
}

/**
 * Build a detail location for a resource by instantiating its model class
 * Works with ANY extension - uses the actual model classes
 * @param {*} store Vuex store
 * @param {*} resource object with {type, cluster, namespace, name/id}
 * @param {*} productName the target product name
 * @returns route location object with name and params, or null
 */
function buildDetailLocationFromModel(store: any, resource: any, productName: string) {
  const {
    cluster, type, namespace, name
  } = resource || {};

  console.log('--- Building detail location from model:', {
    cluster, type, namespace, name, productName
  });

  try {
    // Get the product object to access inStore
    const targetProduct = store.getters['type-map/activeProducts']
      ?.find((p: any) => p.name === productName);

    if (!targetProduct?.inStore) {
      return null;
    }

    const targetStore = targetProduct.inStore;

    // Build minimal data object for model instantiation
    const data = {
      type:     type,
      id:       namespace ? `${ namespace }/${ name }` : name,
      metadata: {
        name:      name,
        namespace: namespace,
      }
    };

    // Get the correct store context
    const storeCtx = store.getters[`${ targetStore }/classify`];

    if (!storeCtx) {
      return null;
    }

    // Instantiate the model with the correct store context
    // The Resource base class constructor is: constructor(data, ctx, rehydrateNamespace, isClone)
    const ModelClass = storeCtx(data);

    // Create a context object that proxies getters to the target store
    // This allows model getters like this.$getters.schemaFor to work
    const context = {
      getters: new Proxy({}, {
        get: (target, prop) => {
          // First try target store's getter
          const getter = store.getters[`${ targetStore }/${ prop as string }`];
          if (getter !== undefined) return getter;
          
          // Fall back to root getters
          return store.rootGetters[prop];
        }
      }),
      rootGetters: new Proxy({}, {
        get: (target, prop) => {
          // Override productId and clusterId for the target product/cluster
          if (prop === 'productId') {
            return productName;
          }
          if (prop === 'clusterId') {
            return resource.cluster;
          }
          
          // All other root getters pass through
          return store.rootGetters[prop];
        }
      }),
      state: store.state,
      rootState: store.state,
      dispatch: store.dispatch.bind(store),
      commit: store.commit.bind(store)
    };

    const modelInstance = new ModelClass(data, context, null, false);

    console.log('--- Instantiated model instance:', modelInstance);

    // Get the detail location from the model's getter
    const detailLocation = modelInstance.detailLocation;

    return detailLocation || null;
  } catch (e) {
    console.warn('Failed to build detail location from model:', e);

    return null;
  }
}

onMounted(async() => {

  // Find the target product that owns this resource type
  const targetProduct = findProductForResourceType(props.value.resource?.type || '');
  
  // Try to build detail location from model class
  const detailLocation = buildDetailLocationFromModel(store, props.value.resource, targetProduct?.name || '');
  
  if (detailLocation) {
    console.log('--- Built resource detail location:', detailLocation);

    store.state.$router.push(detailLocation);
  }

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

    console.log('--- Finding resource in local cluster:', {
      inStore: inStore.value,
      cluster,
      type:    normalizedType,
      id
    });

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
    warn(`Resource Button - Could not find resource with { store: ${ inStore.value }, cluster: ${ cluster }, type: ${ type }, name: ${ name }, namespace: ${ namespace } }`, e);
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
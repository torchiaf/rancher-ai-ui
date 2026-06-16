<script setup lang="ts">
import { computed, onMounted, watch, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { STORE } from '@shell/store/store-types';
import { warn } from '../../../utils/log';
import { convertToManagementType } from '../../../utils/schema';
import RcButton from '@components/RcButton/RcButton.vue';
import { MessageAction } from '../../../types';
import { ActionType } from '../../../types';

// TODO

// - neuvector bug - the product is wrong we need identify better the product for a resource type!!!

// - Check schema
// - Check cluster (Harvester could have been reimported)
// - 

// TODO probably we can use $plugins or $extensions to get the product (fleet needs custom handlling)

// TODO find a better way to determine the product store for a resource type - maybe a mapping in the type map?
const excludeProducts = ['auth', 'apps', 'explorer', 'manager', 'navlinks', 'settings', 'uiplugins'];

const rancherStores = [STORE.MANAGEMENT, STORE.CLUSTER, STORE.RANCHER];

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  value: {
    type:    Object as PropType<MessageAction>,
    default: () => ({} as MessageAction),
  }
});

const product = computed(() => {
  const { type = '' } = props.value.resource || {};

  // Standard Kubernetes types (no API group) always go to explorer
  if (!type.includes('.') && !type.includes('/')) {
    return 'explorer';
  }

  const activeProducts = store.getters['type-map/activeProducts'];

  const filteredProducts = activeProducts.filter((p: any) => !excludeProducts.includes(p.name));

  for (const product of filteredProducts) {
    const allTypes = store.getters['type-map/allTypes'](product.name)?.['all'] || {};

    if (product.name === 'fleet' && !type.includes('fleet.cattle.io')) {
      continue;
    }
    if (allTypes[type]) {
      return product.name;
    }
  }

  return 'explorer';
})

const inStore = computed(() => {
  const { type } = props.value.resource || {};
  const resourceType = normalizeType(type) || '';

  const activeProducts = store.getters['type-map/activeProducts'];

  for (const product of activeProducts) {
    if (excludeProducts.includes(product.name)) {
      continue;
    }

    const allTypes = store.getters['type-map/allTypes'](product.name)?.['all'] || {};

    // console.log('----- routers', store.state.$router.getRoutes());

    if (allTypes[resourceType]) {
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

const isManagementStore = computed(() => inStore.value === STORE.MANAGEMENT);

const resource = computed(() => {
  const { type, namespace, name, detailLocation } = props.value.resource || {};

  if (detailLocation) {
    return props.value.resource;
  }

  const normalizedType = normalizeType(type);
  const id = namespace ? `${ namespace }/${ name }` : name;

  return store.getters[`${ inStore.value }/byId`](normalizedType, id);
});

/**
 * Load the schema for a resource type using the cluster API directly
 */
async function loadSchemaViaClusterAPI(cluster: string, productName: string, resourceType: string) {
  try {
    const url = `/k8s/clusters/${ cluster }/v1/${ productName }/schemas/${ resourceType }`;
    console.log(`Loading schema via cluster API: ${ url }`);
    
    const schema = await store.dispatch(`${ inStore.value }/request`, { url });
    
    if (schema) {
      console.log(`Schema loaded for ${ resourceType }:`, schema);
      return schema;
    }
  } catch (e) {
    console.warn(`Failed to load schema for ${ resourceType } via cluster API:`, e);
  }
  return null;
}

function getDetailLocationFromResource(fetchedSchema: any = null) {

  console.log('--- instore', inStore.value);

  if (!resource.value && !fetchedSchema) {
    return null;
  }

  const {
    cluster, type, namespace, name
  } = props.value.resource || {};

  const id = namespace ? `${ namespace }/${ name }` : name;

  try {
    // Build minimal data object for model instantiation
    const data = {
      type,
      id,
      metadata: {
        name:      name,
        namespace: namespace,
      }
    };

    // Get the correct store context
    const storeCtx = store.getters[`${ inStore.value }/classify`];

    if (!storeCtx) {
      return null;
    }

    // Instantiate the model with the correct store context
    const ModelClass = storeCtx(data);

    // Create a context object that provides the schema when the model needs it
    const context = {
      getters: new Proxy({}, {
        get: (target, prop) => {
          // When the model asks for schemaFor, return our fetched schema if available
          if (prop === 'schemaFor' && fetchedSchema) {
            return (resourceType: string) => {
              if (resourceType === type) {
                return fetchedSchema;
              }
              // Fall back to the store's getter
              return store.getters[`${ inStore.value }/schemaFor`]?.(resourceType);
            };
          }
          
          const key = `${ inStore.value }/${ prop as string }`;
          return store.getters[key] || store.getters[prop as string];
        }
      }),
      rootGetters: new Proxy({}, {
        get: (target, prop) => {
          if (prop === 'productId') {
            return product.value;
          }
          if (prop === 'clusterId') {
            return cluster;
          }
          return store.getters[prop as string];
        }
      }),
      state: store.state,
      rootState: store.state,
      dispatch: store.dispatch.bind(store),
      commit: store.commit.bind(store)
    };

    const modelInstance = new ModelClass(data, context, null, false);

    console.log('--- Instantiated model instance:', modelInstance);
    console.log('--- Detail location:', modelInstance.detailLocation);

    return modelInstance.detailLocation || null;
  } catch (e) {
    console.warn('Failed to build detail location from model:', e);

    return null;
  }
}

const label = computed(() => {
  if (props.value.label) {
    return props.value.label;
  }

  return t(`ai.message.actions.label`, {
    kind: resource.value ? resource.value.kind : props.value.resource?.kind || '',
    name: resource.value ? (resource.value.nameDisplay || resource.value.name) : props.value.resource?.name || ''
  }, true);
});

function normalizeType(type?: string) {
  if (isManagementStore.value) {
    return convertToManagementType(type || '');
  }

  return type;
}

let cachedSchema: any = null;

function goTo() {
  const detailLocation = getDetailLocationFromResource(cachedSchema);
  console.log('--- ResourceButton goTo', detailLocation);
  if (detailLocation) {
    store.state.$router.push(detailLocation);
  }
}

const loadAndCache = async () => {
  if (!!props.value.resource?.detailLocation || !!resource.value) {
    return;
  }

  if (isManagementStore.value) {
    await store.dispatch('loadManagement');
  }

  const {
    cluster, type, namespace, name
  } = props.value.resource || {};

  // Load the schema for this resource type using the cluster API
  // This ensures the model's detailLocation getter has schema info (e.g., namespaced)
  cachedSchema = await loadSchemaViaClusterAPI(cluster || '', product.value, type || '');

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
    warn(`Resource Button - Could not find resource with { store: ${ inStore.value }, cluster: ${ cluster }, type: ${ type }, name: ${ name }, namespace: ${ namespace } }`, e);
  }

  const detailLocation = getDetailLocationFromResource(cachedSchema);

  console.log('--- ResourceButton onMounted', detailLocation);
};

onMounted(async () => {
  await loadAndCache();
});

watch(() => store.getters.clusterReady, async(isReady) => {
  if (isReady) {
    cachedSchema = null;
    await loadAndCache();
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
      :disabled="!resource"
      @click="goTo"
    >
      <span class="rc-button-label">
        {{ label }}
      </span>
    </RcButton>
  </div>
  <span v-if="props.value.type === ActionType.Link">
    <a
      v-if="resource"
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

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import RcButton from '@components/RcButton/RcButton.vue';
import { ToolAction } from '../../types';
import { SCHEMA } from '@shell/config/types';

interface RouteConfig {
  schema: string;
  resolve: (...args: string[]) => string;
}

const ROUTES: Record<string, RouteConfig> = {
  ['projects-namespaces']: {
    schema: 'management.cattle.io.project',
    resolve: (cluster: string) => `/c/${ cluster }/explorer/projectsnamespaces`,
  },
  ['deployments']: {
    schema: 'apps.deployment',
    resolve:  (cluster: string) => `/c/${ cluster }/explorer/apps.deployment`,
  },
  ['clusters']: {
    schema: 'provisioning.cattle.io.cluster',
    resolve: () => '/c/_/manager/provisioning.cattle.io.cluster',
  },
  ['settings']: {
    schema: 'management.cattle.io.setting',
    resolve: () => '/c/_/settings/management.cattle.io.setting',
  },
}

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolAction>,
    default: () => {},
  },
});

const route = computed(() => {
  const config = ROUTES[props.tool.input.route];

  if (!config) {
    return null;
  }

  const { schema, resolve } = config;

  // console.log('--- all schemas', store.getters[`${ 'management' }/all`](SCHEMA).map((s: any) => s.id));

  if (!store.getters['management/schemaFor'](schema)) {
    return null;
  }

  return resolve(props.tool.input.cluster);
});

const label = computed(() => {
  return props.tool.input.label || t(`aiConfig.form.section.tools.fields.tools.name.${ props.tool.toolName }`, {}, true) || props.tool.toolName;
});

function navigateToRoute() {
  if (route.value) {
    store.state.$router.push(route.value);
  } else {
    console.warn(`Unknown route: ${ props.tool.input.route }`);
  }
}
</script>

<template>
  <div v-if="route">
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

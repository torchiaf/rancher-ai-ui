<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import {
  CATALOG, EVENT, FLEET, MANAGEMENT, NODE, POD, WORKLOAD_TYPES
} from '@shell/config/types';
import RcButton from '@components/RcButton/RcButton.vue';
import { ToolCall } from '../../types';
import { warn } from '../../utils/log';

interface RouteConfig {
  schema: string;
  resolve: (...args: string[]) => string; // eslint-disable-line no-unused-vars
}

const enum ROUTE_ID {
  ProjectsNamespaces = 'projects-namespaces',
  Nodes = 'nodes',
  Events = 'events',
  Charts = 'charts',
  Clusters = 'clusters',
  Fleet = 'fleet',
  Users = 'users',
  Settings = 'settings',
  Deployments = 'deployments',
  Pods = 'pods',
}

const ROUTES: Record<string, RouteConfig> = {
  [ROUTE_ID.ProjectsNamespaces]: {
    schema:  MANAGEMENT.PROJECT,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/projectsnamespaces`,
  },
  [ROUTE_ID.Nodes]: {
    schema:  NODE,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/node`,
  },
  [ROUTE_ID.Events]: {
    schema:  EVENT,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/event`,
  },
  [ROUTE_ID.Charts]: {
    schema:  CATALOG.APP,
    resolve: (cluster: string) => `/c/${ cluster }/apps/charts`,
  },
  [ROUTE_ID.Clusters]: {
    schema:  'provisioning.cattle.io.cluster',
    resolve: () => '/c/_/manager/provisioning.cattle.io.cluster',
  },
  [ROUTE_ID.Fleet]: {
    schema:  FLEET.GIT_REPO,
    resolve: () => '/c/_/fleet',
  },
  [ROUTE_ID.Users]: {
    schema:  MANAGEMENT.USER,
    resolve: () => '/c/_/auth/management.cattle.io.user',
  },
  [ROUTE_ID.Settings]: {
    schema:  MANAGEMENT.SETTING,
    resolve: () => '/c/_/settings/management.cattle.io.setting',
  },
  [ROUTE_ID.Deployments]: {
    schema:  WORKLOAD_TYPES.DEPLOYMENT,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/apps.deployment`,
  },
  [ROUTE_ID.Pods]: {
    schema:  POD,
    resolve: (cluster: string) => `/c/${ cluster }/explorer/pod`,
  }
};

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  tool: {
    type:    Object as PropType<ToolCall>,
    default: () => {},
  },
});

const route = computed(() => {
  const config = ROUTES[props.tool.input.route];

  if (!config) {
    return null;
  }

  const { schema, resolve } = config;

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
    warn(`Unknown route: ${ props.tool.input.route }`);
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

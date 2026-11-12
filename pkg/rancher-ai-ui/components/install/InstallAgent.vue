<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { CATALOG } from '@shell/config/types';
import RcButton from '@components/RcButton/RcButton.vue';
import AppModal from '@shell/components/AppModal.vue';
import AgentValuesModal from './AgentValuesModal.vue';
// @ts-expect-error FIXME: Cannot find module '../../assets/liz-icon.svg'
import lizIcon from '../../assets/liz-icon.svg';
import { AGENT_NAMESPACE, AGENT_RELEASE_NAME, PRODUCT_NAME } from '../../product';
import { InstallStep, InstallStepStatus, useAgentInstallerComposable } from '../../composables/useAgentInstallerComposable';

const STATUS_ICON: Record<InstallStepStatus, string> = {
  [InstallStepStatus.Pending]:    '',
  [InstallStepStatus.InProgress]: 'icon-spinner icon-spin',
  [InstallStepStatus.Done]:       'icon-checkmark',
  [InstallStepStatus.Error]:      'icon-error',
};

const store = useStore();
const { t } = useI18n(store);

const emit = defineEmits(['reload']);

const { state, install, installChart } = useAgentInstallerComposable();

const steps = computed(() => [
  {
    key:  InstallStep.Repository,
    link: state.repositoryExists ? {
      name:   'c-cluster-product-resource-id',
      params: {
        cluster:  'local',
        product:  'apps',
        resource: CATALOG.CLUSTER_REPO,
        id:       state.repositoryName
      },
    } : null,
  },
  {
    key:  InstallStep.Agent,
    link: state.appExists ? {
      name:   'c-cluster-product-resource-namespace-id',
      params: {
        cluster:   'local',
        product:   'apps',
        resource:  CATALOG.APP,
        namespace: AGENT_NAMESPACE,
        id:        AGENT_RELEASE_NAME
      },
    } : null,
  },
  {
    key:  InstallStep.Configure,
    link: null,
  },
].map((step, index) => ({
  ...step,
  index:  index + 1,
  status: state.steps[step.key].status,
  error:  state.steps[step.key].error,
})));

const showAgentActions = computed(() => state.started &&
  state.steps[InstallStep.Repository].status === InstallStepStatus.Done &&
  [InstallStepStatus.Pending, InstallStepStatus.Error].includes(state.steps[InstallStep.Agent].status));

const hasError = computed(() => [InstallStep.Repository, InstallStep.Agent].some((step) => state.steps[step].status === InstallStepStatus.Error));

const showValuesModal = ref(false);

function routeToSettings() {
  store.state.$router.push({
    name:   `c-cluster-settings-${ PRODUCT_NAME }`,
    params: { cluster: store.state.$route.params.cluster || 'local' },
    query:  { section: 'ai-agent-settings' },
  });
}
</script>

<template>
  <div
    class="install-agent"
    data-testid="rancher-ai-ui-install-agent"
  >
    <div class="install-agent-avatar">
      <img
        :src="lizIcon"
        alt=""
        width="70"
        height="70"
      />
    </div>

    <div
      class="install-agent-bubble"
      data-testid="rancher-ai-ui-install-agent-bubble"
    >
      <div class="install-agent-title">
        <b>{{ t('ai.install.title') }}</b>
      </div>

      <!-- Not started: explain why and offer the installation -->
      <template v-if="!state.started">
        <span>{{ t('ai.install.notInstalled') }}</span>
        <div class="install-agent-actions">
          <RcButton
            small
            variant="primary"
            data-testid="rancher-ai-ui-install-agent-start"
            @click="install"
          >
            {{ t('ai.install.actions.install') }}
          </RcButton>
        </div>
      </template>

      <!-- Configuration applied: the agent is up and running -->
      <template v-else-if="state.configApplied">
        <span>{{ t('ai.install.applied') }}</span>
        <div class="install-agent-actions">
          <RcButton
            small
            variant="primary"
            data-testid="rancher-ai-ui-install-agent-reload"
            @click="emit('reload')"
          >
            <i class="icon icon-refresh" />
            {{ t('ai.install.actions.reload') }}
          </RcButton>
        </div>
      </template>

      <!-- Installing -->
      <template v-else>
        <ol class="install-agent-steps">
          <li
            v-for="step in steps"
            :key="step.key"
            class="install-agent-step"
            :class="`status-${ step.status }`"
            :data-testid="`rancher-ai-ui-install-agent-step-${ step.key }`"
          >
            <span
              class="install-agent-step-status"
              :aria-label="t(`ai.install.status.${ step.status }`)"
            >
              <i
                v-if="STATUS_ICON[step.status]"
                :class="['icon', STATUS_ICON[step.status]]"
                aria-hidden="true"
              />
              <span v-else>{{ step.index }}</span>
            </span>
            <div class="install-agent-step-content">
              <span class="install-agent-step-label">
                <router-link
                  v-if="step.link"
                  :to="step.link"
                >
                  {{ t(`ai.install.steps.${ step.key }.label`) }}
                </router-link>
                <template v-else>
                  {{ t(`ai.install.steps.${ step.key }.label`) }}
                </template>
              </span>
              <span class="install-agent-step-description text-deemphasized">
                {{ t(`ai.install.steps.${ step.key }.description`) }}
              </span>
              <span
                v-if="step.error"
                class="install-agent-step-error text-error"
              >
                {{ step.error }}
              </span>
              <div
                v-if="step.key === InstallStep.Agent && showAgentActions"
                class="install-agent-actions"
              >
                <RcButton
                  small
                  variant="secondary"
                  data-testid="rancher-ai-ui-install-agent-edit-values"
                  @click="showValuesModal = true"
                >
                  {{ t(state.values ? 'ai.install.actions.editedValues' : 'ai.install.actions.editValues') }}
                </RcButton>
                <RcButton
                  small
                  variant="primary"
                  data-testid="rancher-ai-ui-install-agent-install-chart"
                  @click="installChart"
                >
                  {{ t('ai.install.actions.installChart') }}
                </RcButton>
              </div>
              <span
                v-if="step.key === InstallStep.Configure && state.verifyingConfig"
                class="install-agent-step-description"
              >
                {{ t('ai.install.verifying') }}
              </span>
              <div
                v-else-if="step.key === InstallStep.Configure && (step.status === InstallStepStatus.InProgress || step.status === InstallStepStatus.Error)"
                class="install-agent-actions"
              >
                <RcButton
                  v-if="$route.name !== `c-cluster-settings-${ PRODUCT_NAME }`"
                  small
                  variant="primary"
                  data-testid="rancher-ai-ui-install-agent-configure"
                  @click="routeToSettings"
                >
                  {{ t('ai.install.actions.configure') }}
                </RcButton>
                <!-- <div v-else>
                  <i class="icon icon-checkmark" />
                  <span>
                    {{ t('ai.install.viewingSettings') }}
                  </span>
                </div> -->
              </div>
            </div>
          </li>
        </ol>
        <div
          v-if="hasError"
          class="install-agent-actions"
        >
          <RcButton
            small
            variant="secondary"
            data-testid="rancher-ai-ui-install-agent-retry"
            @click="install"
          >
            {{ t('ai.install.actions.retry') }}
          </RcButton>
        </div>
      </template>
    </div>
  </div>
  <app-modal
    v-if="showValuesModal"
    :width="800"
    height="auto"
    :click-to-close="false"
  >
    <AgentValuesModal @close="showValuesModal = false" />
  </app-modal>
</template>

<style lang="scss" scoped>
.install-agent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 16px;
  margin-top: auto;
  margin-bottom: auto;
  overflow-y: auto;
}

.install-agent-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104px;
  height: 104px;
  background: var(--body-bg);
  border: 1px solid var(--border);
  border-radius: 50%;
}

.install-agent-bubble {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 12px;
  line-height: 21px;
  background: var(--body-bg);
  color: var(--body-text);
  border: 1px solid var(--border);
  border-radius: 12px;
  word-break: break-word;
}

.install-agent-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  .icon {
    margin-right: 4px;
  }
}

.install-agent-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.install-agent-step {
  display: flex;
  gap: 12px;

  .install-agent-step-status {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--border);
    font-size: 12px;
  }

  &.status-done .install-agent-step-status {
    color: var(--success);
    border-color: var(--success);
  }

  &.status-error .install-agent-step-status {
    color: var(--error);
    border-color: var(--error);
  }

  &.status-inProgress .install-agent-step-status {
    color: var(--primary);
    border-color: var(--primary);
  }

  &.status-pending {
    .install-agent-step-label, .install-agent-step-description {
      opacity: 0.6;
    }
  }

  .install-agent-step-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .install-agent-step-label {
    font-weight: 600;
  }

  .install-agent-actions {
    justify-content: flex-start;
    margin-top: 4px;
  }
}
</style>

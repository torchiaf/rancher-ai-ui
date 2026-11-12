<script setup lang="ts">
// @ts-expect-error FIXME: no type declarations for js-yaml
import jsyaml from 'js-yaml';
import { onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import YamlEditor from '@shell/components/YamlEditor.vue';
import Loading from '@shell/components/Loading.vue';
import Banner from '@components/Banner/Banner.vue';
import RcButton from '@components/RcButton/RcButton.vue';
import { useAgentInstallerComposable } from '../../composables/useAgentInstallerComposable';

const store = useStore();
const { t } = useI18n(store);

const emit = defineEmits(['close']);

const { loadValues, setValues } = useAgentInstallerComposable();

const isLoading = ref(true);
const yaml = ref('');
const error = ref('');

onMounted(async() => {
  try {
    yaml.value = jsyaml.dump(await loadValues(), { lineWidth: -1 });
  } catch (err: any) {
    error.value = err?.message || `${ err }`;
  }

  isLoading.value = false;
});

function save() {
  let values;

  try {
    values = jsyaml.load(yaml.value) || {};
  } catch (err: any) {
    error.value = t('ai.install.values.invalid', { error: err?.message || err });

    return;
  }

  if (typeof values !== 'object' || Array.isArray(values)) {
    error.value = t('ai.install.values.invalid', { error: t('ai.install.values.notAnObject') });

    return;
  }

  setValues(values);
  emit('close');
}

function restoreDefaults() {
  setValues(null);
  emit('close');
}
</script>

<template>
  <div
    class="agent-values"
    data-testid="rancher-ai-ui-install-agent-values"
  >
    <h4 class="m-0">
      {{ t('ai.install.values.title') }}
    </h4>
    <p class="text-deemphasized m-0">
      {{ t('ai.install.values.description') }}
    </p>

    <Loading
      v-if="isLoading"
      mode="relative"
    />
    <div
      v-else-if="yaml"
      class="agent-values-editor"
    >
      <YamlEditor
        v-model:value="yaml"
        :scrolling="true"
        data-testid="rancher-ai-ui-install-agent-values-editor"
      />
    </div>

    <Banner
      v-if="error"
      class="m-0"
      color="error"
      :label="error"
    />

    <div class="agent-values-actions">
      <RcButton
        variant="tertiary"
        data-testid="rancher-ai-ui-install-agent-values-restore"
        @click="restoreDefaults"
      >
        {{ t('ai.install.values.restore') }}
      </RcButton>
      <div class="agent-values-actions-right">
        <RcButton
          variant="secondary"
          data-testid="rancher-ai-ui-install-agent-values-cancel"
          @click="emit('close')"
        >
          {{ t('generic.cancel') }}
        </RcButton>
        <RcButton
          variant="primary"
          :disabled="isLoading || !yaml"
          data-testid="rancher-ai-ui-install-agent-values-save"
          @click="save"
        >
          {{ t('generic.save') }}
        </RcButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.agent-values {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.agent-values-editor {
  height: 60vh;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: auto;
}

.agent-values-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.agent-values-actions-right {
  display: flex;
  gap: 8px;
}
</style>

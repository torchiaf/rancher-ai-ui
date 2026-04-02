<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { useRouter, onBeforeRouteUpdate } from 'vue-router';
import jsyaml from 'js-yaml';
import YamlEditor from '@shell/components/YamlEditor';
import RcButton from '@components/RcButton/RcButton.vue';

const store = useStore();
const router = useRouter();
const { t } = useI18n(store);

// const editorRef = ref();
const proposedContent = ref('');
// const contentHasChanged = ref(false);

const stagingData = computed(() => store.getters['rancher-ai-ui/staging/stagingData']);
const editorMode = computed(() => store.getters['rancher-ai-ui/staging/editorMode']);

const currentContent = computed(() => {
  let yaml = stagingData.value?.currentContent || '';

  // Ensure it's a string
  if (typeof yaml !== 'string') {
    yaml = jsyaml.dump(yaml);
  }

  return yaml;
});

const newContent = computed(() => {
  let yaml = stagingData.value?.newContent || '';

  // Ensure it's a string
  if (typeof yaml !== 'string') {
    yaml = jsyaml.dump(yaml);
  }

  return yaml;
});

const resourceLabel = computed(() => {
  if (!stagingData.value?.resource) {
    return t('ai.staging.unknownResource', {}, true);
  }

  const { kind, name, namespace } = stagingData.value.resource;
  const id = namespace ? `${ namespace }/${ name }` : name;

  return `${ kind }: ${ id }`;
});

// const showShowDiffButton = computed(() => false);

// Sync proposedContent with newContent immediately
watch(newContent, (val) => {
  proposedContent.value = val;
}, { immediate: true });

// Handle navigation to same route (when clicking another ShowYaml/ShowYamlDiff tool)
onBeforeRouteUpdate(async(to, from) => {
  // Force re-render by refreshing proposedContent
  proposedContent.value = newContent.value;

  return true;
});

onMounted(async() => {
  console.log('Staging page mounted');
  console.log('Staging data from store:', editorMode.value);
  console.log('Current content:', currentContent.value);
  console.log('New content:', newContent.value);

  if (!stagingData.value) {
    router.back();
  }
});

function handleCancel() {
  store.commit(`rancher-ai-ui/staging/setStagingData`, null);
  store.commit(`rancher-ai-ui/staging/setEditorMode`, null);
  router.back();
}

function handleApply() {
  // TODO: Apply YAML to cluster
  console.log('Applying YAML changes:', proposedContent.value);
  router.back();
}

function toggleShowDiff() {
  // TODO: Toggle between showing diff and showing editor
}

function onInput(value: string) {
  // Update proposed content when user edits
  proposedContent.value = value;
}
</script>

<template>
  <div class="staging-editor">
    <div class="staging-header">
      <div class="staging-title">
        <h1>{{ t('ai.staging.title', {}, true) }}</h1>
        <p class="resource-label">
          {{ resourceLabel }}
        </p>
      </div>
      <div class="staging-actions">
        <RcButton
          v-if="false"
          secondary
          data-testid="staging-editor-show-diff-button"
          @click="toggleShowDiff"
        >
          {{ t('ai.staging.showDiff', {}, true) }}
        </RcButton>

        <RcButton
          v-if="false"
          secondary
          data-testid="staging-editor-back-to-edit-button"
          @click="toggleShowDiff"
        >
          {{ t('ai.staging.backToEdit', {}, true) }}
        </RcButton>

        <RcButton
          secondary
          data-testid="staging-editor-cancel-button"
          @click="handleCancel"
        >
          {{ t('ai.staging.cancel', {}, true) }}
        </RcButton>
        <RcButton
          primary
          data-testid="staging-editor-apply-button"
          @click="handleApply"
        >
          {{ t('ai.staging.apply', {}, true) }}
        </RcButton>
      </div>
    </div>

    <div class="staging-editor-container">
      <YamlEditor
        ref="editorRef"
        :value="proposedContent"
        :initial-yaml-values="currentContent"
        :editor-mode="editorMode"
        :scrolling="true"
        class="yaml-editor"
        data-testid="staging-yaml-editor"
        @onInput="onInput"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.staging-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: var(--body-bg);
}

.staging-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.staging-title {
  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .resource-label {
    margin: 8px 0 0 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.staging-actions {
  display: flex;
  gap: 12px;
}

.staging-editor-container {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: auto;
}
</style>

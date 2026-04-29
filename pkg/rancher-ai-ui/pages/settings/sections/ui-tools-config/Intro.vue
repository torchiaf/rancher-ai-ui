<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import Banner from '@components/Banner/Banner.vue';
import RcButton from '@components/RcButton/RcButton.vue';
import RichTranslation from '@shell/components/RichTranslation.vue';
import { ToolsDefinitionActionType } from '../../../../types';

const store = useStore();
const { t } = useI18n(store);

const props = defineProps({
  requiredAction: {
    type:    String as () => ToolsDefinitionActionType,
    default: ToolsDefinitionActionType.None,
  },
  readOnly: {
    type:    Boolean,
    default: false,
  },
});

const emit = defineEmits(['publish:tools']);

const toolsDefinitionActionType = computed(() => {
  const user = props.readOnly ? 'user' : 'admin';
  const type = props.requiredAction;

  return {
    color:   type === ToolsDefinitionActionType.Create ? 'info' : 'warning',
    message: t(`aiConfig.form.section.tools.publish.action.${ type }.message.${ user }`, {}, true),
  };
});

const docsUrl = 'https://rancher.github.io/rancher-ai-product-docs/rancher-ai/latest/en/introduction.html';
</script>

<template>
  <div class="ui-tools-definition-notice">
    <!-- Informational Introduction Section -->
    <div class="tools-intro-section">
      <div class="intro-header">
        <h2 class="intro-title">
          {{ t('aiConfig.form.section.tools.intro.title', {}, true) }}
        </h2>
        <p class="intro-description">
          {{ t('aiConfig.form.section.tools.intro.description', {}, true) }}
        </p>
      </div>

      <div class="intro-features">
        <div class="feature-item">
          <i class="feature-icon icon icon-gear" />
          <div class="feature-content">
            <h3 class="feature-title">
              {{ t('aiConfig.form.section.tools.intro.feature1.title', {}, true) }}
            </h3>
            <p class="feature-text">
              {{ t('aiConfig.form.section.tools.intro.feature1.description', {}, true) }}
            </p>
          </div>
        </div>

        <div class="feature-item">
          <i class="feature-icon icon icon-lightning" />
          <div class="feature-content">
            <h3 class="feature-title">
              {{ t('aiConfig.form.section.tools.intro.feature2.title', {}, true) }}
            </h3>
            <p class="feature-text">
              {{ t('aiConfig.form.section.tools.intro.feature2.description', {}, true) }}
            </p>
          </div>
        </div>
      </div>

      <div class="intro-disclaimer">
        <i class="disclaimer-icon icon icon-info" />
        <p class="disclaimer-text">
          {{ t('aiConfig.form.section.tools.intro.disclaimer', {}, true) }}
        </p>
      </div>

      <div class="intro-cta">
        <RichTranslation k="aiConfig.form.section.tools.intro.learnMore">
          <template #documentation="{ content }">
            <a
              :href="docsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="cta-link"
            >
              {{ content }}
              <i class="icon icon-external-link" />
            </a>
          </template>
        </RichTranslation>
      </div>
    </div>

    <!-- Action Banner Section -->
    <div
      v-if="props.requiredAction !== ToolsDefinitionActionType.None"
      class="tools-action-section"
    >
      <Banner
        class="m-0"
        :color="toolsDefinitionActionType.color"
      >
        <span
          v-clean-html="toolsDefinitionActionType.message"
        />
      </Banner>
      <RcButton
        v-if="!props.readOnly"
        primary
        @click="emit('publish:tools')"
      >
        {{ t(`aiConfig.form.section.tools.publish.action.${ props.requiredAction }.label`, {}, true) }}
      </RcButton>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-tools-definition-notice {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 24px;
}

.tools-intro-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: linear-gradient(135deg, var(--card-background-light) 0%, var(--card-background) 100%);
}

.intro-header {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .intro-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--body-text);
    margin: 0;
  }

  .intro-description {
    font-size: 14px;
    color: var(--body-text-secondary);
    margin: 0;
    line-height: 1.5;
  }
}

.intro-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.feature-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.feature-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--link);
}

.feature-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.feature-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0;
}

.feature-text {
  font-size: 12px;
  color: var(--body-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.intro-disclaimer {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  background: var(--warning-light);
  border-radius: 6px;
  border-left: 4px solid var(--warning);
}

.disclaimer-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--warning);
  margin-top: 2px;
}

.disclaimer-text {
  font-size: 12px;
  color: var(--body-text);
  margin: 0;
  line-height: 1.4;
}

.intro-cta {
  padding-top: 8px;
  font-size: 13px;
  color: var(--body-text-secondary);
}

.cta-link {
  color: var(--link);
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: var(--link-hover);
    text-decoration: underline;
  }

  .icon-external-link {
    font-size: 12px;
  }
}

.tools-action-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;

  .m-0 {
    margin: 0;
  }
}
</style>

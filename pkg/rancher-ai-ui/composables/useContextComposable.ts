import { ref, computed, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import type { Context } from '../types';

/**
 * Composable for managing the AI context state.
 * @returns Composable for managing the AI context state.
 */

const selectedContext = ref<Context[]>([]);

export function useContextComposable() {
  const store = useStore();

  const chatContext = computed(() => store.getters['rancher-ai-ui/context/all']);

  const hooksContext = computed(() => store.getters['rancher-ai-ui/context/hooks']);

  function selectContext(context: Context[]) {
    selectedContext.value = context;
  }

  onBeforeUnmount(() => {
    store.commit('rancher-ai-ui/context/reset');
  });

  return {
    chatContext,
    hooksContext,
    selectContext,
    selectedContext
  };
}

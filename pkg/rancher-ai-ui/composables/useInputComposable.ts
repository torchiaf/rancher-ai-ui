import { useStore } from 'vuex';
import { computed } from 'vue';

/**
 * Composable for managing the AI input text state.
 */
export function useInputComposable() {
  const store = useStore();

  // Two-way computed:
  // - get: from getter (as before)
  // - set: commit to the same mutation you already use
  const inputText = computed<string>({
    get: () => store.getters['rancher-ai-ui/input/text'],
    set: (value: string) => {
      store.commit('rancher-ai-ui/input/text', value);
    },
  });

  function updateInput(value: string) {
    inputText.value = value; // goes through the setter → commit
  }

  function cleanInput(value: string) {
    return (value || '')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n')
      .trim();
  }

  return {
    inputText,
    updateInput,
    cleanInput,
  };
}

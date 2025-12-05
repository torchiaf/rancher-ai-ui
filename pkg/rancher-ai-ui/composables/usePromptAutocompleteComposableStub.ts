import { ref } from 'vue';
import { Context, Message } from '../types';

export function usePromptAutocompleteComposable() {
  const ws = ref<WebSocket | null>(null);
  const pendingAutocomplete = ref(false);
  const autocomplete = ref('');

  let streamInterval: number | null = null;

  async function connect() {
    ws.value = {} as any;
  }

  function disconnect() {
    ws.value = null;
    stopStream();
  }

  function stopStream() {
    if (streamInterval !== null) {
      clearInterval(streamInterval);
      streamInterval = null;
    }
    pendingAutocomplete.value = false;
  }

  // ----------------------------
  // STUB: Simulated autocomplete
  // ----------------------------
  function fetchAutocomplete(args: {
    prompt: string,
    messages: Message[],
    selectedContext: Context[],
    hooksContext: Context[]
  }) {
    stopStream();

    const prompt = args.prompt;
    let text = 'Hello world how are you, I am a simulated autocomplete response from the Rancher AI backend. This is only a stub for testing purposes.';

    //
    // FIX: Correctly remove the prefix that matches the prompt
    //
    if (text.startsWith(prompt)) {
      text = text.slice(prompt.length);
    }

    autocomplete.value = '';
    pendingAutocomplete.value = true;

    let i = 0;

    streamInterval = window.setInterval(() => {
      if (i < text.length) {
        // produce the streamed chunk
        autocomplete.value = text.slice(0, i + 1);
        i++;
      } else {
        stopStream();
      }
    }, 40);
  }

  return {
    ws,
    connect,
    disconnect,
    autocomplete,
    fetchAutocomplete
  };
}

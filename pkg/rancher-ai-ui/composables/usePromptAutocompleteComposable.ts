import { ref } from 'vue';
import { useStore } from 'vuex';
import { Context, Message, Tag } from '../types';
import { formatAutocompleteMessage } from '../utils/format';

export function usePromptAutocompleteComposable() {
  const store = useStore();
  const t = store.getters['i18n/t'];

  const ws = ref(null as WebSocket | null);

  const pendingAutocomplete = ref<boolean>(false);
  const autocomplete = ref<string>('');

  async function connect(
    agentNamespace: string,
    agentName: string,
    agentApiPath: string
  ) {
    const url = `wss://${ window.location.host }/api/v1/namespaces/${ agentNamespace }/services/http:${ agentName }:80/proxy/${ agentApiPath }`;

    const ws = new WebSocket(url);

    ws.onopen = onopen as any;
    ws.onmessage = onmessage;
    ws.onclose = onclose;
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
    }
  }

  function fetchAutocomplete(args: { prompt: string, messages: Message[], selectedContext: Context[], hooksContext: Context[] }) {
    const msg = formatAutocompleteMessage(args.prompt, args.selectedContext, args.hooksContext, args.messages, t);

    ws.value?.send(msg);
  }

  function onopen(event: { target: WebSocket }): void {
    ws.value = event.target;
  }

  async function onmessage(event: MessageEvent) {
    const data = event.data;

    switch (data) {
    case Tag.MessageStart:
      pendingAutocomplete.value = true;
      autocomplete.value = '';
      break;
    case Tag.MessageEnd: {
      pendingAutocomplete.value = false;
      break;
    }
    default:
      if (pendingAutocomplete.value) {
        autocomplete.value += data;
      }
      break;
    }
  }

  function onclose() {
    ws.value = null;
  }

  return {
    ws,
    connect,
    disconnect,
    autocomplete,
    fetchAutocomplete
  };
}

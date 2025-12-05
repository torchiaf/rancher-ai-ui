import { ref } from 'vue';
import { useStore } from 'vuex';
import { Context, Message, Tag } from '../types';
import { formatAutocompleteMessage, formatAutocompleteItems } from '../utils/format';

export function usePromptAutocompleteComposable() {
  const store = useStore();
  const t = store.getters['i18n/t'];

  const ws = ref(null as WebSocket | null);

  const pendingAutocomplete = ref<boolean>(false);
  const currentPayload = ref<{ items: any[], completion: string }>({
    items:      [],
    completion: ''
  });

  const autocomplete = ref<string>('');
  const autocompleteItems = ref<any[]>([]);

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

  function fetchAutocomplete(args: { prompt: string, messages: Message[], selectedContext: Context[], hooksContext: Context[], wildcard: string | undefined }) {
    const msg = formatAutocompleteMessage(args.prompt, args.selectedContext, args.hooksContext, args.messages, args.wildcard, t);

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
      autocompleteItems.value = [];

      currentPayload.value = {
        items:      [],
        completion: ''
      };
      break;
    case Tag.MessageEnd: {
      pendingAutocomplete.value = false;

      // If we have items, the completion is not relevant - the user will work with the items in the dropdown
      if (currentPayload.value.items.length > 0) {
        autocompleteItems.value = currentPayload.value.items;
        autocomplete.value = '';
      } else {
        autocomplete.value = currentPayload.value.completion;
        autocompleteItems.value = [];
      }
      break;
    }
    default:
      if (pendingAutocomplete.value) {
        currentPayload.value.completion += data;

        if (currentPayload.value.completion.includes(Tag.AutocompleteItem) && currentPayload.value.completion.includes(Tag.AutocompleteItemEnd)) {
          const { items, remaining } = formatAutocompleteItems(currentPayload.value.items || [], currentPayload.value.completion);

          currentPayload.value.items = items;
          currentPayload.value.completion = remaining;
          break;
        }
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
    autocompleteItems,
    fetchAutocomplete
  };
}

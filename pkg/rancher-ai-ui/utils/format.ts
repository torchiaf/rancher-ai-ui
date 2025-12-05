import MarkdownIt from 'markdown-it';
import {
  ActionType, MessageConfirmationAction, Tag, Context,
  Message,
  Role,
  MessageAction,
  AutocompletePayload
} from '../types';
import { validateActionResource } from './validator';

const md = new MarkdownIt({
  html:        true,
  breaks:      true,
  linkify:     true,
  typographer: true,
});

export function formatMessageContent(message: string) {
  const raw = md.render(message ?? '');

  // remove trailing <br> tags and trailing whitespace/newlines
  return raw.replace(/(?:(?:<br\s*\/?>)|\r?\n|\s)+$/gi, '');
}

// TODO: Remove calculated keys with index, backend change needed to accept array of contexts
export function formatMessagePromptWithContext(prompt: string, selectedContext: Context[]): string {
  const keys: Record<string, number> = {};
  const context: Record<string, string | object | null> = {};

  for (const ctx of selectedContext) {
    if (!keys[ctx.tag]) {
      keys[ctx.tag] = 0;
    }

    const key = context[ctx.tag] !== undefined ? `${ ctx.tag } ${ ++keys[ctx.tag] }` : ctx.tag;

    context[key] = ctx.value;
  }

  return JSON.stringify({
    prompt,
    context
  });
}

export function formatAutocompleteMessage(
  prompt: string,
  selectedContext: Context[],
  hooksContext: Context[],
  previousMessages: Message[],
  wildcard: string | undefined,
  t: any
): string {
  const keys: Record<string, number> = {};
  const context: Record<string, string | object | null> = {};

  // Feed context from both selectedContext and hooksContext, unique by tag+value
  const all = [
    ...selectedContext,
    ...formatContextFromHook(hooksContext, t),
  ].filter((item, index, self) => index === self.findIndex((c) => c.tag === item.tag && c.value === item.value));

  for (const ctx of all) {
    if (!keys[ctx.tag]) {
      keys[ctx.tag] = 0;
    }

    const key = context[ctx.tag] !== undefined ? `${ ctx.tag } ${ ++keys[ctx.tag] }` : ctx.tag;

    context[key] = ctx.value;
  }

  const chatPayload = (previousMessages || [])
    .slice(-5)
    .filter((msg) => msg?.role !== Role.System)
    .map((msg) => {
      let content = msg.messageContent || '';

      if (msg.relatedResourcesActions?.length) {
        content += `\n  Resources: ${ JSON.stringify((msg.relatedResourcesActions || []).map((action) => action.resource)) }`;
      }

      return {
        role: msg.role,
        content
      };
    });

  const out: AutocompletePayload = {
    prompt,
    context,
    chatPayload,
  };

  if (wildcard) {
    out.wildcard = wildcard;
  }

  return JSON.stringify(out);
}

export function formatContextFromHook(context: Context[], t: any): Context[] {
  const out: Context[] = [];

  for (const ctx of context) {
    const resource = ctx.value as any;

    if (resource) {
      // Add hooked resource as context
      const resourceCtx = {
        tag:         resource?.kind?.toLowerCase(),
        description: resource?.kind,
        icon:        ctx.icon,
        value:       resource?.name
      };

      out.push(resourceCtx);

      if (resource?.namespace && out.findIndex((c) => c.tag === 'namespace' && c.value === resource.namespace) === -1) {
        // Add resource's namespace as context if available
        const resourceNamespaceCtx = {
          tag:         'namespace',
          description: t('ai.message.template.namespace'),
          icon:        'icon-namespace',
          value:       resource?.namespace
        };

        out.push(resourceNamespaceCtx);
      }
    }
  }

  return out;
}

export function formatMessageRelatedResourcesActions(value: string, actionType = ActionType.Button): MessageAction[] {
  value = value.replaceAll(Tag.McpResultStart, '').replaceAll(Tag.McpResultEnd, '').replace(/'([^']*)'/g, '"');

  if (value) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.flatMap((item) => formatMessageRelatedResourcesActions(JSON.stringify(item), actionType));
      }

      if (!validateActionResource(parsed)) {
        return [];
      }

      const names = Array.isArray(parsed.name) ? parsed.name : [parsed.name];

      return names.map((name: string) => ({
        type:     actionType,
        label:    `View ${ parsed.kind }: ${ name }`,
        resource: {
          kind:      parsed.kind,
          type:      parsed.type,
          name,
          namespace: parsed.namespace,
          cluster:   parsed.cluster,
        },
      }));
    } catch (e) {
      console.error('Failed to parse MCP response:', e); /* eslint-disable-line no-console */
    }
  }

  return [];
}

export function formatConfirmationAction(value: string): MessageConfirmationAction | null {
  value = value.replaceAll(Tag.ConfirmationStart, '').replaceAll(Tag.ConfirmationEnd, '').replace(/'([^']*)'/g, '"');

  if (value) {
    try {
      const parsed = JSON.parse(value);

      return parsed;
    } catch (e) {
      console.error('Failed to parse confirmation response:', e); /* eslint-disable-line no-console */
    }
  }

  return null;
}

export function formatSuggestionActions(suggestionActions: string[], remaining: string): { suggestionActions: string[]; remaining: string } {
  const re = /<suggestion\b[^>]*>([\s\S]*?)<\/suggestion>/i;
  const match = remaining?.match(re);

  if (match) {
    const inner = match[1]; // first suggestion text

    suggestionActions.push(inner.trim());
    remaining = remaining.replace(match[0], '').trim();

    if (remaining) {
      return formatSuggestionActions(suggestionActions, remaining);
    }
  }

  return {
    suggestionActions,
    remaining
  };
}

export function formatAutocompleteItems(items: string[], remaining: string): { items: string[]; remaining: string } {
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/i;
  const match = remaining?.match(re);

  if (match) {
    const inner = match[1];

    try {
      const parsedItem = JSON.parse(inner);

      items.push(parsedItem);
    } catch (e) {
      console.error('Failed to parse autocomplete item:', e); /* eslint-disable-line no-console */
    }

    remaining = remaining.replace(match[0], '').trim();

    if (remaining) {
      return formatAutocompleteItems(items, remaining);
    }
  }

  return {
    items,
    remaining
  };
}
export function formatFileMessages(principal: any, messages: Message[]): string {
  const avatar = {
    [Role.User]:      `👤 ${ principal?.name || 'user' }`,
    [Role.Assistant]: '🤖 Liz',
    [Role.System]:    '🛠️ Liz',
  };

  return (messages || []).map((msg) => {
    const timestamp = msg.timestamp?.toLocaleTimeString([], {
      hour:   '2-digit',
      minute: '2-digit'
    });

    let body = msg.summaryContent ? `Summary: ${ msg.summaryContent }\n` : '';

    body += msg.templateContent?.content?.message ? `${ msg.templateContent.content.message }\n` : '';
    body += msg.messageContent ? `${ msg.messageContent }\n` : '';
    body += msg.thinkingContent ? `${ msg.thinkingContent }\n` : '';

    if (msg.contextContent?.length) {
      body += `Context: ${ JSON.stringify(msg.contextContent) }\n`;
    }

    if (msg.suggestionActions?.length) {
      body += `Suggestions: [${ msg.suggestionActions.join('], [') }]\n`;
    }

    return `[${ timestamp }] [${ avatar[msg.role] }]: ${ body }`;
  }).join('\n');
}

export function formatErrorMessage(value: string): { message: string } {
  value = value.replaceAll(Tag.ErrorStart, '').replaceAll(Tag.ErrorEnd, '').replace(/'([^']*)'/g, '"');

  if (value) {
    try {
      const parsed = JSON.parse(value);

      return parsed;
    } catch (e) {
      console.error('Failed to parse error message:', e); /* eslint-disable-line no-console */
    }
  }

  return { message: 'An error occurred.' };
}

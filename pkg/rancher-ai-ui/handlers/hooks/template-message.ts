import { Store } from 'vuex';
import { Context, Message, Role, HookContextTag } from '../../types';
import { formatContextFromHook } from '../../utils/format';

export interface MessageTemplateFill {
  message: Message;
  payload: string;
}

/**
 * Factory for creating template messages based on context.
 *
 * It's used in Hooks overlays to generate user messages for the AI based on the selected resource
 */
class TemplateMessageFactory {
  fill(store: Store<any>, ctx: Context, globalCtx: Context[]): Message {
    const t = store.getters['i18n/t'];

    let messageContent = t('ai.message.template.heyAnalyzeResource');
    let summaryContent = '';

    const resource = ctx.value as any;

    const resourceCtx = formatContextFromHook([ctx], t);

    switch (ctx.tag) {
    case HookContextTag.SortableTableRow:
    case HookContextTag.DetailsState:
      summaryContent = t('ai.message.template.summary.analyseKindAndTroubleshoot', {
        kind: resource.kind,
        name: resource.name
      }, true);
      messageContent = t('ai.message.template.message.explainStateForResource', {
        state: resource.state,
        kind:  resource.kind,
        name:  resource.name
      }, true);

      if (resource.state !== 'active' && resource.state !== 'running' && resource.state !== 'ready') {
        messageContent += `\n  - ${ t('ai.message.template.bullet.identifyCause') }\n  - ${ t('ai.message.template.bullet.provideActions') }`;
      } else {
        messageContent += `\n  - ${ t('ai.message.template.bullet.confirmExpectedState') }`;
      }
      break;
    case HookContextTag.StatusBanner:
      const { label, color } = resource.bannerProps || {};

      const issueText = color === 'error' ? t('ai.message.template.theError') : t('ai.message.template.anyProblems');

      summaryContent = t('ai.message.template.summary.analyseBanner', {
        label,
        issue: issueText
      }, true);
      messageContent = t('ai.message.template.message.explainStateForResource', {
        state: resource.state,
        kind:  resource.kind,
        name:  resource.name
      }, true);

      if (resource.state !== 'active' && resource.state !== 'running' && resource.state !== 'ready') {
        messageContent += `\n  - ${ t('ai.message.template.bullet.identifyCause') }\n  - ${ t('ai.message.template.bullet.provideActions') }`;
      } else {
        messageContent += `\n  - ${ t('ai.message.template.bullet.confirmExpectedState') }`;
      }
      break;
    default:
      break;
    }

    const contextContent = [
      ...(globalCtx || []),
      ...resourceCtx,
    ].filter((item, index, self) => index === self.findIndex((c) => c.tag === item.tag && c.value === item.value));

    return {
      role:      Role.User,
      messageContent,
      summaryContent,
      contextContent,
      completed: true
    };
  }
}

export default new TemplateMessageFactory();
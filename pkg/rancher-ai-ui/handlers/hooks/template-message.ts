import { Store } from 'vuex';
import { Context, Message, Role } from '../../types';
import { nextTick } from 'vue';

interface TemplateMessageContent {
  message: string;
  chatMessage: Message | null;
}

class TemplateMessageFactory {
  fill(store: Store<any>, context: Context): TemplateMessageContent {
    return {
      message: 'Ciao!',
      chatMessage: {
        role: Role.User,
        messageContent: 'Ciao!',
      }
    };
  }
}

export default new TemplateMessageFactory();
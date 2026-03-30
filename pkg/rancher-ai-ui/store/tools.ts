import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { UIToolsConfig } from '../types';

/**
 * Manages the state of the UI tools configuration within the Rancher AI UI.
 */

interface State {
  config: UIToolsConfig;
}

const getters = {
  config: (state: State) => {
    return state.config;
  },
};

const mutations = {
  setConfig(state: State, config: UIToolsConfig) {
    state.config = config;
  },
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return { config: {} as UIToolsConfig };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};
const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/tools` };

export default {
  specifics: factory(),
  config
};
import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { EditorMode, Message } from '../types';

/**
 * Manages the state for staging YAML content before applying to the cluster.
 */

interface StagingData {
  original: string;
  patched: string;
  resource?: {
    kind: string;
    namespace: string;
    name: string;
  };
  title?: string;
  sourceMessage?: Message;
}

interface State {
  staging: StagingData | null;
  mode: EditorMode;
}

const getters = {
  stagingData: (state: State) => {
    return state.staging;
  },
  editorMode: (state: State) => {
    return state.mode;
  }
};

const mutations = {
  setStagingData(state: State, data: StagingData | null) {
    state.staging = data;
  },
  setEditorMode(state: State, mode: EditorMode) {
    state.mode = mode;
  }
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return {
        staging: null,
        mode:    EditorMode.VIEW_CODE
      };
    },
    getters:   { ...getters },
    mutations: { ...mutations },
    actions:   { ...actions },
  };
};

const config: CoreStoreConfig = { namespace: `${ PRODUCT_NAME }/staging` };

export default {
  specifics: factory(),
  config
};

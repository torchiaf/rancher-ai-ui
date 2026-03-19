import { PRODUCT_NAME } from '../product';
import { CoreStoreSpecifics, CoreStoreConfig } from '@shell/core/types';
import { EDITOR_MODES } from '@shell/components/YamlEditor';

/**
 * Manages the state for staging YAML content before applying to the cluster.
 */

interface StagingData {
  currentContent: string;
  newContent: string;
  resource?: {
    kind: string;
    namespace: string;
    name: string;
  };
  title?: string;
}

interface State {
  staging: StagingData | null;
  mode: EDITOR_MODES.DIFF_CODE | EDITOR_MODES.VIEW_CODE;
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
  setEditorMode(state: State, mode: EDITOR_MODES) {
    state.mode = mode;
  }
};

const actions = {};

const factory = (): CoreStoreSpecifics => {
  return {
    state: (): State => {
      return {
        staging: null,
        mode:    EDITOR_MODES.VIEW_CODE
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

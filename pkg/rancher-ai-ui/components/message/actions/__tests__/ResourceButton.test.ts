import { mount, flushPromises } from '@vue/test-utils';
import ResourceButton from '../ResourceButton.vue';
import { STORE } from '@shell/store/store-types';
import { ActionType } from '../../../../types';

jest.mock('vuex', () => ({ useStore: jest.fn(() => mockStore) }));

jest.mock('@components/RcButton/RcButton.vue', () => ({ default: { template: '<button><slot /></button>' } }));
jest.mock('../../../../utils/schema', () => ({ convertToManagementType: (type: string) => `mgmt.${ type }` }));

// Global mock store
const mockStore = {
  state:   { $router: { push: jest.fn() } },
  getters: {
    'currentProduct':               { inStore: '' },
    [`${ STORE.MANAGEMENT }/byId`]: jest.fn(),
    [`${ STORE.CLUSTER }/byId`]:    jest.fn(),
    [`${ STORE.RANCHER }/byId`]:    jest.fn(),
    'harvester/byId':               jest.fn(),
    'cluster/byId':                 jest.fn(),
  },
  dispatch: jest.fn(),
};

const requiredSetup = (value: any) => ({
  global: { stubs: { RcButton: true } },
  props:  { value },
});

describe('ResourceButton.vue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.getters['currentProduct'].inStore = STORE.MANAGEMENT;
  });

  describe('inStore computed', () => {
    it.each([
      STORE.CLUSTER,
      STORE.RANCHER,
      STORE.MANAGEMENT
    ])('should return MANAGEMENT for %s store', (storeType) => {
      mockStore.getters['currentProduct'].inStore = storeType;
      const wrapper = mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'pods'
        }
      }));

      expect((wrapper.vm as any).inStore).toBe(STORE.MANAGEMENT);
    });

    it('should return actual store for non-Rancher stores (harvester)', () => {
      mockStore.getters['currentProduct'].inStore = 'harvester';
      const wrapper = mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'pods'
        }
      }));

      expect((wrapper.vm as any).inStore).toBe('harvester');
    });
  });

  describe('to computed', () => {
    it('should return resource with detailLocation', () => {
      const detailLocation = {
        name:   'detail',
        params: { id: 'test' }
      };
      const wrapper = mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:           'test',
          type:           'pods',
          detailLocation
        }
      }));

      expect((wrapper.vm as any).to).toEqual(expect.objectContaining({ detailLocation }));
    });

    it('should fetch resource by id', () => {
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(mockRes);
      const wrapper = mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'pods'
        }
      }));

      expect((wrapper.vm as any).to).toEqual(mockRes);
    });

    it('should handle namespaced ids', () => {
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(mockRes);
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:      'test',
          namespace: 'default',
          type:      'pods'
        }
      }));
      expect((mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mock.calls[0][1]).toBe('default/test');
    });

    it('should handle non-namespaced ids', () => {
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(mockRes);
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:      'test',
          type:      'pods'
        }
      }));
      expect((mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mock.calls[0][1]).toBe('test');
    });
  });

  describe('normalizeType function', () => {
    it('should normalize type for MANAGEMENT store', () => {
      mockStore.getters['currentProduct'].inStore = STORE.MANAGEMENT;
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(mockRes);

      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'pods'
        }
      }));

      const byIdCall = (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mock.calls[0];

      expect(byIdCall[0]).toContain('mgmt');
    });

    it('should normalize type for CLUSTER store (maps to MANAGEMENT)', () => {
      mockStore.getters['currentProduct'].inStore = STORE.CLUSTER;
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(mockRes);

      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'deployments'
        }
      }));

      const byIdCall = (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mock.calls[0];

      expect(byIdCall[0]).toContain('mgmt');
    });

    it('should not normalize type for non-Rancher stores (harvester)', () => {
      mockStore.getters['currentProduct'].inStore = 'harvester';
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters['harvester/byId'] as jest.Mock).mockReturnValue(mockRes);

      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'pods'
        }
      }));

      const byIdCall = (mockStore.getters['harvester/byId'] as jest.Mock).mock.calls[0];

      expect(byIdCall[0]).toBe('pods');
      expect(byIdCall[0]).not.toContain('mgmt');
    });

    it('should handle undefined type in management store', () => {
      mockStore.getters['currentProduct'].inStore = STORE.MANAGEMENT;
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(mockRes);

      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: undefined
        }
      }));

      const byIdCall = (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mock.calls[0];

      expect(byIdCall[0]).toBeDefined();
    });

    it('should handle undefined type in non-Rancher store', () => {
      mockStore.getters['currentProduct'].inStore = 'harvester';
      const mockRes = {
        kind: 'Pod',
        name: 'test'
      };

      (mockStore.getters['harvester/byId'] as jest.Mock).mockReturnValue(mockRes);

      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: undefined
        }
      }));

      const byIdCall = (mockStore.getters['harvester/byId'] as jest.Mock).mock.calls[0];

      expect(byIdCall[0]).toBeUndefined();
    });
  });

  describe('goTo function', () => {
    it('should push router with detailLocation', () => {
      const detailLoc = {
        name:   'detail',
        params: { id: 'test-id' }
      };
      const wrapper = mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:           'test',
          type:           'pods',
          detailLocation: detailLoc
        }
      }));

      (wrapper.vm as any).goTo();
      expect(mockStore.state.$router.push).toHaveBeenCalledWith(expect.objectContaining({ name: 'detail' }));
    });

    it('should merge cluster param', () => {
      const detailLoc = {
        name:   'detail',
        params: { id: 'test-id' }
      };
      const wrapper = mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:           'test',
          type:           'pods',
          cluster:        'local',
          detailLocation: detailLoc
        }
      }));

      (wrapper.vm as any).goTo();
      expect(mockStore.state.$router.push).toHaveBeenCalledWith(expect.objectContaining({ params: expect.objectContaining({ cluster: 'local' }) }));
    });
  });

  describe('onMounted hook', () => {
    it('should not dispatch if detailLocation provided', async() => {
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:           'test',
          type:           'pods',
          detailLocation: { name: 'detail' }
        }
      }));
      await flushPromises();
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch if resource found', async() => {
      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue({ kind: 'Pod' });
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name: 'test',
          type: 'pods'
        }
      }));
      await flushPromises();
      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should load management for Rancher products', async() => {
      mockStore.getters['currentProduct'].inStore = STORE.MANAGEMENT;
      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(undefined);
      mockStore.dispatch.mockResolvedValue({});
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:    'test',
          type:    'pods',
          cluster: 'local'
        }
      }));
      await flushPromises();
      expect(mockStore.dispatch).toHaveBeenCalledWith('loadManagement');
    });

    it('should NOT load management for non-Rancher products even if resource not found', async() => {
      mockStore.getters['currentProduct'].inStore = 'harvester';
      (mockStore.getters['harvester/byId'] as jest.Mock).mockReturnValue(undefined);
      mockStore.dispatch.mockResolvedValue({});
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:    'test',
          type:    'pods',
          cluster: 'local'
        }
      }));
      await flushPromises();
      expect(mockStore.dispatch).not.toHaveBeenCalledWith('loadManagement');
    });

    it('should find resource in local cluster', async() => {
      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(undefined);
      mockStore.dispatch.mockResolvedValue({});
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:      'test-pod',
          namespace: 'default',
          type:      'pods',
          cluster:   'local'
        }
      }));
      await flushPromises();
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        `${ STORE.MANAGEMENT }/find`,
        expect.objectContaining({
          cluster: 'local',
          id:      'default/test-pod'
        })
      );
    });

    it('should request from remote cluster', async() => {
      (mockStore.getters[`${ STORE.MANAGEMENT }/byId`] as jest.Mock).mockReturnValue(undefined);
      mockStore.dispatch.mockResolvedValue({ kind: 'Pod' });
      mount(ResourceButton, requiredSetup({
        type:     ActionType.Button,
        label:    'Test',
        resource: {
          name:      'test',
          namespace: 'default',
          type:      'pods',
          cluster:   'remote'
        }
      }));
      await flushPromises();
      const requestCall = mockStore.dispatch.mock.calls.find((c) => c[0].includes('request'));

      expect(requestCall).toBeDefined();
      expect(requestCall[1].url).toContain('/k8s/clusters/remote');
    });
  });
});

import { computed, reactive, watch, WatchStopHandle } from 'vue';
import { useStore } from 'vuex';
import { cloneDeep, merge } from 'lodash';
import {
  CATALOG, CONFIG_MAP, MANAGEMENT, POD, SECRET, WORKLOAD_TYPES
} from '@shell/config/types';
import { SECRET_TYPES } from '@shell/config/secret';
import { base64Encode } from '@shell/utils/crypto';
import { SETTING } from '@shell/config/settings';
import { isAdminUser } from '@shell/store/type-map';
import { CATALOG as CATALOG_ANNOTATIONS } from '@shell/config/labels-annotations';
import { getHelmChart, getHelmRepositoryExact } from '@shell/utils/uiplugins';
import {
  AGENT_CHART_NAME,
  AGENT_CONFIG_CONFIG_MAP_NAME,
  AGENT_NAME,
  AGENT_NAMESPACE,
  AGENT_RELEASE_NAME,
  AGENT_REPO_AUTH_ENABLED,
  AGENT_REPO_AUTH_SECRET_GENERATE_NAME,
  AGENT_REPO_AUTH_SECRET_NAMESPACE,
  AGENT_REPO_NAME,
  AGENT_REPO_URL,
  AGENT_DEFAULT_REGISTRY,
} from '../product';
import { warn } from '../utils/log';
import { decodeModelKey } from '../utils/settings';
import Chat from '../handlers/chat';

export const enum InstallStep {
  Repository = 'repository',
  Agent = 'agent',
  Configure = 'configure',
}

export const enum InstallStepStatus {
  Pending = 'pending',
  InProgress = 'inProgress',
  Done = 'done',
  Error = 'error',
}

interface InstallStepState {
  status: InstallStepStatus;
  error?: string;
}

export interface RepositoryCredentials {
  username: string;
  password: string;
}

const REPOSITORY_WAIT_RETRIES = 60;
const REPOSITORY_WAIT_INTERVAL = 2000;
const DEPLOYMENT_WAIT_RETRIES = 120;
const DEPLOYMENT_WAIT_INTERVAL = 5000;
const CONFIG_APPLY_DELAY = 1000;

// Container states that won't recover without a change to the release
const POD_FAILURE_REASONS = ['CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'InvalidImageName', 'CreateContainerConfigError', 'CreateContainerError'];

// Shared between the chat panel and the settings page
const state = reactive({
  started:          false,
  // The Apps are in the store and kept up to date
  appsLoaded:       false,
  verifyingConfig:  false,
  configApplied:    false,
  repositoryName:   AGENT_REPO_NAME,
  repositoryExists: false,
  appExists:        false,
  // Helm values edited by the user; the defaults are used when null
  values:           null as Record<string, any> | null,
  steps:            {
    [InstallStep.Repository]: { status: InstallStepStatus.Pending },
    [InstallStep.Agent]:      { status: InstallStepStatus.Pending },
    [InstallStep.Configure]:  { status: InstallStepStatus.Pending },
  } as Record<InstallStep, InstallStepState>,
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CancelledError extends Error {}

// Incremented to cancel the steps currently running
let currentRun = 0;
let validationStarted = false;
let stopValidationWatch: WatchStopHandle | null = null;

async function pause(ms: number, run: number) {
  await sleep(ms);

  if (run !== currentRun) {
    throw new CancelledError();
  }
}

function errorMessage(err: any): string {
  return err?.message || err?.data?.message || err?._statusText || `${ err || '' }`;
}

/**
 * Composable for the single-click installation of the AI agent:
 *
 * 1. Add the AI agent Helm repository (OCI ClusterRepo)
 * 2. Install the AI agent chart
 * 3. Wait for the user to configure the AI assistant in the settings page
 */
export function useAgentInstallerComposable() {
  const store = useStore();

  const canInstall = computed(() => {
    const canCreate = (type: string) => !!store.getters['management/schemaFor'](type)?.collectionMethods?.find((m: string) => m.toUpperCase() === 'POST');

    return isAdminUser(store.getters) && canCreate(CATALOG.CLUSTER_REPO) && canCreate(CATALOG.APP);
  });

  // The install flow stays visible until the user reloads the chat after configuring the assistant
  const isActive = computed(() => state.started);

  function setStep(step: InstallStep, status: InstallStepStatus, error?: string) {
    state.steps[step] = {
      status,
      error
    };
  }

  function findAgentDeployment() {
    return store.getters['management/all'](WORKLOAD_TYPES.DEPLOYMENT)
      .find((d: any) => d.metadata?.name === AGENT_NAME && d.metadata?.namespace === AGENT_NAMESPACE);
  }

  async function ensureRepository(credentials?: RepositoryCredentials) {
    let repository = await getHelmRepositoryExact(store, AGENT_REPO_URL);

    if (!repository) {
      repository = await createRepository(credentials);
    }

    state.repositoryName = repository.metadata?.name || AGENT_REPO_NAME;
    state.repositoryExists = true;

    return repository;
  }

  /**
   * Creates the basic-auth secret used by the ClusterRepo to pull from the OCI registry.
   */
  async function createRepositorySecret(credentials: RepositoryCredentials) {
    const secret = await store.dispatch('management/create', {
      type:     SECRET,
      _type:    SECRET_TYPES.BASIC,
      metadata: {
        namespace:    AGENT_REPO_AUTH_SECRET_NAMESPACE,
        generateName: AGENT_REPO_AUTH_SECRET_GENERATE_NAME,
      },
      data: {
        username: base64Encode(credentials.username),
        password: base64Encode(credentials.password),
      },
    });

    return await secret.save();
  }

  /**
   * Creates the OCI ClusterRepo and waits for its index to be downloaded.
   */
  async function createRepository(credentials?: RepositoryCredentials) {
    const spec: Record<string, any> = { url: AGENT_REPO_URL };

    if (AGENT_REPO_AUTH_ENABLED) {
      if (!credentials) {
        throw new Error(`Credentials are required to access ${ AGENT_REPO_URL }`);
      }

      const secret = await createRepositorySecret(credentials);

      spec.clientSecret = {
        name:      secret.metadata.name,
        namespace: secret.metadata.namespace,
      };
    }

    const model = await store.dispatch('management/create', {
      type:     CATALOG.CLUSTER_REPO,
      metadata: { name: AGENT_REPO_NAME },
      spec,
    });
    const repository = await model.save();

    for (let i = 0; i < REPOSITORY_WAIT_RETRIES; i++) {
      const repo = await findResource(CATALOG.CLUSTER_REPO, repository.id);
      // OCI repositories report OCIDownloaded instead of Downloaded
      const downloaded = repo?.status?.conditions?.find((c: any) => c.type === 'OCIDownloaded' || c.type === 'Downloaded');

      if (downloaded?.status === 'True') {
        return repo;
      }

      await sleep(REPOSITORY_WAIT_INTERVAL);
    }

    throw new Error(`Unable to download the Helm repository ${ AGENT_REPO_URL }`);
  }

  /**
   * Rancher's system-default-registry setting, as Rancher passes it to the charts it installs.
   */
  async function getSystemDefaultRegistry(): Promise<string> {
    try {
      const setting = await store.dispatch('management/find', {
        type: MANAGEMENT.SETTING,
        id:   SETTING.SYSTEM_DEFAULT_REGISTRY
      });

      if (setting?.value) {
        return setting.value;
      }
    } catch (err) {
      warn('Unable to read the system-default-registry setting:', err);
    }

    return AGENT_DEFAULT_REGISTRY;
  }

  async function getValuesOverrides(): Promise<Record<string, any>> {
    const systemDefaultRegistry = await getSystemDefaultRegistry();

    return {
      global:       { cattle: { systemDefaultRegistry } },
      plan:         { enabled: true },
      planApproval: { enabled: true },
    };
  }

  async function findRepository() {
    const repository = await getHelmRepositoryExact(store, AGENT_REPO_URL);

    if (!repository) {
      throw new Error(`The Helm repository ${ AGENT_REPO_URL } was not found`);
    }

    return repository;
  }

  /**
   * Returns the Helm values for the agent chart: the ones edited by the user,
   * or the chart defaults merged with our overrides.
   */
  async function loadValues(): Promise<Record<string, any>> {
    if (state.values) {
      return cloneDeep(state.values);
    }

    const repository = await findRepository();
    const info = await store.dispatch('management/request', {
      method: 'GET',
      url:    `${ repository.links?.info }&chartName=${ AGENT_CHART_NAME }`,
    });

    return merge(cloneDeep(info?.values || {}), await getValuesOverrides());
  }

  function setValues(values: Record<string, any> | null) {
    state.values = values;
  }

  async function installAgent(repository: any, run: number) {
    if (findAgentDeployment()) {
      await waitForAgentReady(null, run);

      return;
    }

    const chart = await getHelmChart(store, repository, AGENT_CHART_NAME);

    if (!chart) {
      throw new Error(`Chart ${ AGENT_CHART_NAME } not found in ${ AGENT_REPO_URL }`);
    }

    const values = state.values ? cloneDeep(state.values) : await getValuesOverrides();

    const operation = await repository.doAction('install', {
      charts: [{
        chartName:   AGENT_CHART_NAME,
        version:     chart.version,
        releaseName: AGENT_RELEASE_NAME,
        description: AGENT_CHART_NAME,
        annotations: {
          [CATALOG_ANNOTATIONS.SOURCE_REPO_TYPE]: 'cluster',
          [CATALOG_ANNOTATIONS.SOURCE_REPO_NAME]: state.repositoryName,
        },
        values,
      }],
      noHooks:                  false,
      timeout:                  '600s',
      wait:                     true,
      namespace:                AGENT_NAMESPACE,
      projectId:                '',
      disableOpenAPIValidation: false,
      skipCRDs:                 false,
    });

    await waitForAgentReady(operation, run);
  }

  async function findResource(type: string, id: string) {
    try {
      return await store.dispatch('management/find', {
        type,
        id,
        opt: {
          force: true,
          watch: false
        }
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Throws if the Helm operation pod failed.
   */
  async function checkHelmOperation(operation: any) {
    if (!operation?.operationName) {
      return;
    }

    const op = await findResource(CATALOG.OPERATION, `${ operation.operationNamespace }/${ operation.operationName }`);
    const { podName, podNamespace } = op?.status || {};

    if (!podName) {
      return;
    }

    const pod = await findResource(POD, `${ podNamespace }/${ podName }`);
    const failed = pod?.status?.containerStatuses?.find((c: any) => c.state?.terminated && c.state.terminated.exitCode !== 0);

    if (pod?.status?.phase === 'Failed' || failed) {
      const reason = await fetchHelmError(podNamespace, podName, failed?.name) ||
        failed?.state?.terminated?.message || failed?.state?.terminated?.reason || pod.status.phase;

      throw new Error(`Helm installation failed: ${ reason }`);
    }
  }

  /**
   * Returns the "Error: ..." line printed by Helm in the operation pod logs.
   */
  async function fetchHelmError(namespace: string, name: string, container = 'helm'): Promise<string> {
    try {
      const logs = await store.dispatch('management/request', {
        url:          `/k8s/clusters/local/api/v1/namespaces/${ namespace }/pods/${ name }/log?container=${ container }&tailLines=50`,
        responseType: 'text',
      });
      const text = typeof logs === 'string' ? logs : logs?.data || '';

      return text.split('\n').reverse().find((line: string) => line.startsWith('Error:'))?.replace(/^Error:\s*/, '') || '';
    } catch (err) {
      warn('Unable to read the Helm operation logs:', err);

      return '';
    }
  }

  /**
   * Throws if any agent pod is in a state it won't recover from; returns true when all are running and ready.
   */
  async function checkAgentPods(deployment: any): Promise<boolean> {
    const matchLabels = deployment.spec?.selector?.matchLabels || {};
    const selector = Object.entries(matchLabels).map(([key, value]) => `${ key }=${ value }`).join(',');

    const pods = await store.dispatch('management/findMatching', {
      type:      POD,
      selector,
      namespace: AGENT_NAMESPACE,
      opt:       {
        force: true,
        watch: false
      }
    });

    for (const pod of pods || []) {
      const statuses = [...(pod.status?.initContainerStatuses || []), ...(pod.status?.containerStatuses || [])];
      const failed = statuses.find((c: any) => POD_FAILURE_REASONS.includes(c.state?.waiting?.reason));

      if (pod.status?.phase === 'Failed' || failed) {
        const reason = failed ? `${ failed.state.waiting.reason }: ${ failed.state.waiting.message || '' }` : pod.status?.reason || 'Failed';

        throw new Error(`Pod ${ pod.metadata?.name } is not running. ${ reason }`.trim());
      }
    }

    return !!pods?.length && pods.every((pod: any) => pod.status?.phase === 'Running' &&
      (pod.status?.containerStatuses || []).every((c: any) => c.ready));
  }

  /**
   * Waits until the Helm release is deployed and the agent deployment pods are up and running.
   */
  async function waitForAgentReady(operation: any, run: number) {
    for (let i = 0; i < DEPLOYMENT_WAIT_RETRIES; i++) {
      await checkHelmOperation(operation);

      const app = await findResource(CATALOG.APP, `${ AGENT_NAMESPACE }/${ AGENT_RELEASE_NAME }`);
      const helmStatus = app?.spec?.info?.status;

      state.appExists = !!app;

      if (helmStatus === 'failed') {
        throw new Error(`Helm installation failed: ${ app.spec.info.description || helmStatus }`);
      }

      // A deployment installed outside this flow has no App with the expected name
      const isHelmDone = !app || helmStatus === 'deployed';
      const deployment = await findResource(WORKLOAD_TYPES.DEPLOYMENT, `${ AGENT_NAMESPACE }/${ AGENT_NAME }`);

      if (isHelmDone && deployment) {
        const desired = deployment.spec?.replicas ?? 1;
        const available = deployment.status?.availableReplicas || 0;
        const podsReady = await checkAgentPods(deployment);

        if (available >= desired && podsReady) {
          return;
        }
      } else if (deployment) {
        await checkAgentPods(deployment);
      }

      await pause(DEPLOYMENT_WAIT_INTERVAL, run);
    }

    throw new Error(`The ${ AGENT_NAME } deployment is not up and running`);
  }

  /**
   * Step 1: adds the AI agent repository. Returns null on failure or cancellation.
   */
  async function runRepositoryStep(run: number) {
    try {
      setStep(InstallStep.Repository, InstallStepStatus.InProgress);
      const repository = await ensureRepository();

      if (run !== currentRun) {
        return null;
      }

      setStep(InstallStep.Repository, InstallStepStatus.Done);

      return repository;
    } catch (err) {
      if (run === currentRun) {
        warn('Unable to add the AI agent repository:', err);
        setStep(InstallStep.Repository, InstallStepStatus.Error, errorMessage(err));
      }

      return null;
    }
  }

  /**
   * Step 1: adds the AI agent repository, then waits for the user to review the Helm values and install
   * the chart (step 2), unless the agent is already deployed.
   */
  async function install() {
    const run = ++currentRun;

    state.started = true;
    state.configApplied = false;
    state.verifyingConfig = false;
    [InstallStep.Agent, InstallStep.Configure].forEach((step) => setStep(step, InstallStepStatus.Pending));
    startValidation();

    const repository = await runRepositoryStep(run);

    if (!repository) {
      return;
    }

    if (findAgentDeployment()) {
      await runAgentStep(repository, run);
    }
  }

  /**
   * Step 2: installs the AI agent chart.
   */
  async function installChart() {
    const run = ++currentRun;
    let repository;

    try {
      repository = await findRepository();
    } catch (err) {
      if (run === currentRun) {
        warn('Unable to find the AI agent repository:', err);
        setStep(InstallStep.Repository, InstallStepStatus.Error, errorMessage(err));
      }

      return;
    }

    await runAgentStep(repository, run);
  }

  async function runAgentStep(repository: any, run: number) {
    try {
      setStep(InstallStep.Agent, InstallStepStatus.InProgress);
      await installAgent(repository, run);
    } catch (err) {
      if (run === currentRun && !(err instanceof CancelledError)) {
        warn('Unable to install the AI agent:', err);
        setStep(InstallStep.Agent, InstallStepStatus.Error, errorMessage(err));
      }

      return;
    }

    if (run !== currentRun) {
      return;
    }

    setStep(InstallStep.Agent, InstallStepStatus.Done);
    setStep(InstallStep.Configure, InstallStepStatus.InProgress);
  }

  /**
   * Stops the running steps and marks the given step as failed, resetting the following ones.
   */
  function invalidate(step: InstallStep, error: string) {
    currentRun++;
    state.verifyingConfig = false;

    const steps = [InstallStep.Repository, InstallStep.Agent, InstallStep.Configure];

    steps.slice(steps.indexOf(step) + 1).forEach((s) => setStep(s, InstallStepStatus.Pending));
    setStep(step, InstallStepStatus.Error, error);

    if (step === InstallStep.Repository) {
      state.repositoryExists = false;
    } else if (step === InstallStep.Agent) {
      state.appExists = false;
    }
  }

  /**
   * Invalidates the completed steps whose resources have been removed.
   */
  function validateSteps({ repository, agent }: { repository: boolean; agent: boolean }) {
    if (!state.started || state.configApplied) {
      stopValidation();

      return;
    }

    if (!repository && state.steps[InstallStep.Repository].status === InstallStepStatus.Done) {
      invalidate(InstallStep.Repository, `The Helm repository ${ state.repositoryName } has been removed`);

      return;
    }

    if (!agent && state.steps[InstallStep.Agent].status === InstallStepStatus.Done) {
      invalidate(InstallStep.Agent, `The ${ AGENT_CHART_NAME } chart has been removed`);
    }
  }

  /**
   * Watches the resources created by the steps; they are kept up to date in the store by the findAll subscriptions.
   */
  async function startValidation() {
    if (validationStarted) {
      return;
    }

    validationStarted = true;

    try {
      await Promise.all([CATALOG.CLUSTER_REPO, CATALOG.APP, WORKLOAD_TYPES.DEPLOYMENT].map((type) => store.dispatch('management/findAll', { type })));
    } catch (err) {
      warn('Unable to watch the AI agent resources:', err);
    }

    if (!validationStarted) {
      return;
    }

    stopValidationWatch = watch(() => ({
      repository: !!store.getters['management/byId'](CATALOG.CLUSTER_REPO, state.repositoryName),
      // A deployment installed outside this flow has no App with the expected name
      agent:      state.appExists ? !!findAgentApp() : !!findAgentDeployment(),
    }), validateSteps);
  }

  function stopValidation() {
    validationStarted = false;
    stopValidationWatch?.();
    stopValidationWatch = null;
  }

  /**
   * The AI agent Helm release, whatever its name.
   */
  function findAgentApp() {
    return store.getters['management/all'](CATALOG.APP)
      .find((app: any) => app.metadata?.namespace === AGENT_NAMESPACE && app.spec?.chart?.metadata?.name === AGENT_CHART_NAME);
  }

  const isAgentAppMissing = computed(() => state.appsLoaded && !findAgentApp());

  async function loadAgentApp() {
    if (state.appsLoaded || !canInstall.value) {
      return;
    }

    try {
      await store.dispatch('management/findAll', { type: CATALOG.APP });
      state.appsLoaded = true;
    } catch (err) {
      warn('Unable to load the Apps:', err);
    }
  }

  /**
   * Called by the settings page once the AI assistant configuration has been saved.
   * Returns true if the installation flow is waiting for it; the step completes once the
   * configuration is valid and the redeployed agent is up and running.
   */
  function markConfigApplied() {
    const status = state.steps[InstallStep.Configure].status;

    if (status !== InstallStepStatus.InProgress && status !== InstallStepStatus.Error) {
      return;
    }

    verifyConfigApplied();

    if (!Chat.isOpen(store)) {
      Chat.open(store);
    };
  }

  async function verifyConfigApplied() {
    const run = ++currentRun;

    setStep(InstallStep.Configure, InstallStepStatus.InProgress);
    state.verifyingConfig = true;

    try {
      await pause(CONFIG_APPLY_DELAY, run);
      await checkAgentConfig();
      await waitForAgentRollout(run);

      if (run !== currentRun) {
        return;
      }

      setStep(InstallStep.Configure, InstallStepStatus.Done);
      state.configApplied = true;
      stopValidation();
    } catch (err) {
      if (run === currentRun && !(err instanceof CancelledError)) {
        warn('Unable to apply the AI assistant configuration:', err);
        setStep(InstallStep.Configure, InstallStepStatus.Error, errorMessage(err));
      }
    } finally {
      if (run === currentRun) {
        state.verifyingConfig = false;
      }
    }
  }

  function openChatAndInstall() {
    if (!Chat.isOpen(store)) {
      Chat.open(store);
    }

    // The chat shows the ongoing installation, which handles its own retries
    if (!state.started) {
      install();
    }
  }

  /**
   * Throws if the active LLM provider or its model are not set in the agent configuration.
   */
  async function checkAgentConfig() {
    const configMap = await findResource(CONFIG_MAP, `${ AGENT_NAMESPACE }/${ AGENT_CONFIG_CONFIG_MAP_NAME }`);
    const data = configMap?.data || {};
    const activeLlm = data.ACTIVE_LLM;

    if (!activeLlm) {
      throw new Error('The LLM provider is not configured');
    }

    if (!data[decodeModelKey(activeLlm)]) {
      throw new Error('The LLM model is not configured');
    }
  }

  /**
   * Waits until the agent deployment has rolled out the new configuration and its pods are ready.
   */
  async function waitForAgentRollout(run: number) {
    for (let i = 0; i < DEPLOYMENT_WAIT_RETRIES; i++) {
      const deployment = await findResource(WORKLOAD_TYPES.DEPLOYMENT, `${ AGENT_NAMESPACE }/${ AGENT_NAME }`);

      if (!deployment) {
        throw new Error(`The ${ AGENT_NAME } deployment was not found`);
      }

      const desired = deployment.spec?.replicas ?? 1;
      const status = deployment.status || {};
      // status.replicas still counts the old pods while the rollout is in progress
      const rolledOut = (status.observedGeneration ?? 0) >= (deployment.metadata?.generation ?? 0) &&
        (status.updatedReplicas || 0) >= desired &&
        (status.availableReplicas || 0) >= desired &&
        (status.replicas || 0) <= desired;
      const podsReady = await checkAgentPods(deployment);

      if (rolledOut && podsReady) {
        return;
      }

      await pause(DEPLOYMENT_WAIT_INTERVAL, run);
    }

    throw new Error(`The ${ AGENT_NAME } deployment is not up and running`);
  }

  function reset() {
    currentRun++;
    stopValidation();
    state.started = false;
    state.verifyingConfig = false;
    state.configApplied = false;
    state.repositoryExists = false;
    state.appExists = false;
    state.values = null;
    [InstallStep.Repository, InstallStep.Agent, InstallStep.Configure].forEach((step) => setStep(step, InstallStepStatus.Pending));
  }

  return {
    state,
    canInstall,
    isActive,
    openChatAndInstall,
    install,
    installChart,
    loadValues,
    setValues,
    isAgentAppMissing,
    loadAgentApp,
    markConfigApplied,
    reset,
  };
}

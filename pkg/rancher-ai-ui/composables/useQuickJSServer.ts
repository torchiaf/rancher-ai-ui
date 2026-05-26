import { ref, computed } from 'vue';

interface QuickJSServerStatus {
  status: 'running' | 'stopped' | 'connecting';
  logs: string[];
  error?: string;
}

const serverStatus = ref<QuickJSServerStatus>({
  status: 'stopped',
  logs: []
});

const isConnected = computed(() => serverStatus.value.status === 'running');

let worker: Worker | null = null;

/**
 * Initialize the WebWorker
 */
function initializeWorker() {
  if (worker) return;

  try {
    // Load the worker from the bundled source
    worker = new Worker(new URL('./quickjs-server.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      const { type, message, running } = event.data;

      switch (type) {
        case 'LOG':
          addLog(message);
          break;

        case 'STARTED':
          serverStatus.value.status = 'running';
        addLog('✅ QuickJS Server running');
        break;

      case 'STOPPED':
        serverStatus.value.status = 'stopped';
        addLog('⏹️ QuickJS Server stopped');
        break;

      case 'ERROR':
        serverStatus.value.error = message;
        addLog(`❌ Error: ${message}`);
        serverStatus.value.status = 'stopped';
        break;

      case 'PONG':
        if (running && serverStatus.value.status === 'stopped') {
          serverStatus.value.status = 'running';
        }
        break;

      case 'ALREADY_RUNNING':
        addLog('ℹ️ Server already running');
        serverStatus.value.status = 'running';
        break;

      case 'NOT_RUNNING':
        addLog('ℹ️ Server not running');
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      serverStatus.value.error = error.message;
      serverStatus.value.status = 'stopped';
      addLog(`❌ Worker error: ${error.message}`);
    };
  } catch (error) {
    serverStatus.value.error = (error as Error).message;
    addLog(`❌ Failed to initialize worker: ${(error as Error).message}`);
  }
}

function addLog(message: string) {
  serverStatus.value.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
}

/**
 * Start the server in the browser
 */
async function startServer() {
  try {
    if (!worker) {
      initializeWorker();
    }

    if (serverStatus.value.status === 'running') {
      return { success: true, message: 'Server already running' };
    }

    serverStatus.value.status = 'connecting';
    serverStatus.value.error = undefined;
    serverStatus.value.logs = [];

    addLog('🔄 Starting QuickJS server in browser...');

    if (!worker) {
      throw new Error('Worker not available');
    }

    worker.postMessage({
      command: 'START'
    });

    // Wait for response (30 second timeout)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: server took too long to start'));
      }, 30000);

      const checkStarted = () => {
        if (serverStatus.value.status === 'running') {
          clearTimeout(timeout);
          resolve({ success: true, message: 'Server started' });
        }
      };

      // Check every 500ms
      const interval = setInterval(() => {
        if (serverStatus.value.status === 'running') {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve({ success: true, message: 'Server started' });
        } else if (serverStatus.value.error) {
          clearInterval(interval);
          clearTimeout(timeout);
          reject(new Error(serverStatus.value.error));
        }
      }, 500);
    });
  } catch (error) {
    serverStatus.value.status = 'stopped';
    serverStatus.value.error = (error as Error).message;
    addLog(`❌ Error: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Stop the server
 */
async function stopServer() {
  try {
    if (!worker) {
      return { success: true, message: 'Server not running' };
    }

    if (serverStatus.value.status !== 'running') {
      return { success: true, message: 'Server not running' };
    }

    addLog('🔄 Stopping server...');

    worker.postMessage({
      command: 'STOP'
    });

    // Wait for stop (5 second timeout)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverStatus.value.status = 'stopped';
        worker?.terminate();
        worker = null;
        resolve({ success: true, message: 'Server terminated' });
      }, 5000);

      const interval = setInterval(() => {
        if (serverStatus.value.status === 'stopped') {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve({ success: true, message: 'Server stopped' });
        }
      }, 500);
    });
  } catch (error) {
    serverStatus.value.error = (error as Error).message;
    addLog(`❌ Error: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Execute code on the server
 */
async function executeCode(code: string) {
  try {
    if (!worker || serverStatus.value.status !== 'running') {
      throw new Error('Server not available');
    }

    addLog(`📥 Executing code: ${code}`);

    worker.postMessage({
      command: 'EXECUTE',
      payload: { code }
    });

    return { success: true };
  } catch (error) {
    const errorMsg = (error as Error).message;
    serverStatus.value.error = errorMsg;
    addLog(`❌ Error: ${errorMsg}`);
    throw error;
  }
}

/**
 * Check server health
 */
async function checkHealth() {
  if (!worker) {
    return false;
  }

  worker.postMessage({ command: 'PING' });
  return serverStatus.value.status === 'running';
}

/**
 * Clear logs
 */
function clearLogs() {
  serverStatus.value.logs = [];
}

export function useQuickJSServer() {
  return {
    serverStatus,
    isConnected,
    startServer,
    stopServer,
    executeCode,
    checkHealth,
    clearLogs
  };
}

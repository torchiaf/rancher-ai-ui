<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuickJSServer } from '../../composables/useQuickJSServer';

const { serverStatus, isConnected, startServer, stopServer, clearLogs, executeCode } = useQuickJSServer();

const isLoading = ref(false);
const codeToExecute = ref('console.log("Hello from QuickJS server!");');

const statusColor = computed(() => {
  switch (serverStatus.value.status) {
    case 'running':
      return '#4CAF50'; // green
    case 'connecting':
      return '#FFC107'; // amber
    case 'stopped':
      return '#f44336'; // red
    default:
      return '#999';
  }
});

const statusLabel = computed(() => {
  switch (serverStatus.value.status) {
    case 'running':
      return 'Running';
    case 'connecting':
      return 'Connecting...';
    case 'stopped':
      return 'Stopped';
    default:
      return 'Unknown';
  }
});

async function handleStart() {
  isLoading.value = true;
  try {
    await startServer();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    isLoading.value = false;
  }
}

async function handleStop() {
  isLoading.value = true;
  try {
    await stopServer();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    isLoading.value = false;
  }
}

async function handleExecute() {
  try {
    await executeCode(codeToExecute.value);
  } catch (error) {
    console.error('Error:', error);
  }
}
</script>

<template>
  <div class="quickjs-server-control">
    <div class="header">
      <h3>🚀 QuickJS Server in Browser</h3>
      <div class="status-badge">
        <span class="status-dot" :style="{ backgroundColor: statusColor }"></span>
        <span class="status-text">{{ statusLabel }}</span>
      </div>
    </div>

    <div class="controls">
      <button
        @click="handleStart"
        :disabled="isConnected || isLoading"
        class="btn btn-primary"
      >
        {{ isLoading && !isConnected ? '⏳ Starting...' : '▶️ Start Server' }}
      </button>

      <button
        @click="handleStop"
        :disabled="!isConnected || isLoading"
        class="btn btn-danger"
      >
        {{ isLoading && isConnected ? '⏳ Stopping...' : '⏹️ Stop Server' }}
      </button>

      <button
        @click="clearLogs"
        class="btn btn-secondary"
      >
        🗑️ Clear Logs
      </button>
    </div>

    <div class="code-executor" v-if="isConnected">
      <label>Execute JavaScript Code:</label>
      <textarea v-model="codeToExecute" placeholder="console.log('Hello from QuickJS!');" rows="3"></textarea>
      <button @click="handleExecute" class="btn btn-primary">
        📤 Execute
      </button>
    </div>

    <div class="console">
      <div class="console-header">
        📋 Logs ({{ serverStatus.logs.length }})
      </div>
      <div class="console-body">
        <div
          v-for="(log, idx) in serverStatus.logs"
          :key="idx"
          class="log-line"
        >
          {{ log }}
        </div>
        <div v-if="serverStatus.logs.length === 0" class="log-empty">
          Logs will appear here...
        </div>
      </div>
    </div>

    <div v-if="serverStatus.error" class="error-box">
      <strong>❌ Error:</strong> {{ serverStatus.error }}
    </div>
  </div>
</template>

<style scoped>
.quickjs-server-control {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  border: 1px solid #ddd;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.code-executor {
  background: white;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
}

.code-executor label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
}

.code-executor textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  resize: vertical;
}

.code-executor button {
  margin-top: 10px;
}

.console {
  background: #1e1e1e;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 15px;
  border: 1px solid #333;
}

.console-header {
  background: #333;
  color: #00ff00;
  padding: 10px 15px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  border-bottom: 1px solid #444;
}

.console-body {
  background: #1e1e1e;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 12px 15px;
  height: 350px;
  overflow-y: scroll;
  line-height: 1.5;
}

.log-line {
  margin: 2px 0;
  word-break: break-word;
}

.log-empty {
  color: #888;
  font-style: italic;
}

.error-box {
  background: #ffe5e5;
  border: 1px solid #dc3545;
  border-radius: 6px;
  padding: 12px 15px;
  color: #721c24;
  font-size: 14px;
}

@media (max-width: 600px) {
  .quickjs-server-control {
    padding: 15px;
  }

  .controls {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>

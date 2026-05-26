/**
 * QuickJS Server WebWorker
 * Runs QuickJS JavaScript runtime in the browser
 */

import { getQuickJS } from 'quickjs-emscripten';

let vmContext: any = null;
let isRunning = false;
let geminiApiKey: string = '';

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent) => {
  const { command, payload } = event.data;

  try {
    switch (command) {
      case 'START':
        await handleStart(payload);
        break;

      case 'STOP':
        await handleStop();
        break;

      case 'EXECUTE':
        await handleExecute(payload);
        break;

      case 'PING':
        self.postMessage({
          type: 'PONG',
          running: isRunning
        });
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      message: error.message,
      stack: error.stack
    });
  }
};

async function handleStart(payload: any) {
  if (isRunning) {
    self.postMessage({
      type: 'ALREADY_RUNNING',
      message: 'Server already running'
    });
    return;
  }

  try {
    self.postMessage({
      type: 'LOG',
      message: '⏳ Initializing QuickJS runtime...'
    });

    // Store API key from payload (keep hardcoded if not provided)
    geminiApiKey = payload?.geminiApiKey || geminiApiKey;

    // Initialize QuickJS runtime
    const QuickJS = await getQuickJS();
    
    self.postMessage({
      type: 'LOG',
      message: '✅ QuickJS module loaded. Creating VM...'
    });

    // Create a new VM context
    vmContext = QuickJS.newContext();
    
    self.postMessage({
      type: 'LOG',
      message: '✅ QuickJS VM created and ready!'
    });

    // Inject gemini call function into QuickJS context
    const geminiFunc = vmContext.newFunction('geminiCall', (prompt: any) => {
      const promptStr = vmContext.getString(prompt);
      
      // Start the API call in the background (returns immediately)
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptStr }] }]
        })
      })
        .then(r => r.json())
        .then(data => {
          // Log full response for debugging
          self.postMessage({
            type: 'LOG',
            message: `📊 Full Gemini Response: ${JSON.stringify(data)}`
          });
          
          // Extract text from the response
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                       data?.candidates?.[0]?.text ||
                       JSON.stringify(data);
          
          self.postMessage({
            type: 'LOG',
            message: `🤖 Gemini Response: ${text}`
          });
        })
        .catch((e: any) => {
          self.postMessage({
            type: 'ERROR',
            message: `Gemini API Error: ${e.message}`
          });
        });
      
      // Return immediately with status
      return vmContext.newString('Gemini call initiated, check logs for response');
    });
    
    vmContext.setProp(vmContext.global, 'geminiCall', geminiFunc);
    geminiFunc.dispose();

    // Just verify the VM works with a simple expression
    const testResult = vmContext.evalCode('1 + 1');
    if (testResult.error) {
      testResult.error.dispose();
      throw new Error('VM test failed');
    }
    testResult.value.dispose();

    isRunning = true;

    self.postMessage({
      type: 'STARTED',
      message: 'QuickJS server started successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      message: `Error starting server: ${error.message || String(error)}`
    });
    isRunning = false;
  }
}

async function handleStop() {
  if (!isRunning) {
    self.postMessage({
      type: 'NOT_RUNNING',
      message: 'Server not running'
    });
    return;
  }

  try {
    if (vmContext) {
      vmContext.dispose();
      vmContext = null;
    }
    isRunning = false;

    self.postMessage({
      type: 'STOPPED',
      message: 'Server stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      message: `Error stopping server: ${error.message}`
    });
  }
}

async function handleExecute(payload: any) {
  if (!isRunning || !vmContext) {
    self.postMessage({
      type: 'ERROR',
      message: 'Server not running'
    });
    return;
  }

  try {
    const { code } = payload;
    
    self.postMessage({
      type: 'LOG',
      message: `📥 Executing: ${code.substring(0, 50)}...`
    });

    // Execute code in QuickJS
    const result = vmContext.evalCode(code);
    
    if (result.error) {
      // Get the error message before disposing
      let errorMsg = 'Unknown error';
      try {
        errorMsg = vmContext.dump(result.error);
      } catch (e) {
        try {
          errorMsg = String(result.error);
        } catch (e2) {
          errorMsg = 'Code execution failed';
        }
      }
      result.error.dispose();
      
      self.postMessage({
        type: 'ERROR',
        message: errorMsg
      });
    } else {
      try {
        const output = vmContext.dump(result.value);
        result.value.dispose();
        
        self.postMessage({
          type: 'LOG',
          message: `📤 Result: ${output}`
        });

        self.postMessage({
          type: 'EXECUTION_RESULT',
          result: { status: 'success', output }
        });
      } catch (e: any) {
        result.value.dispose();
        self.postMessage({
          type: 'ERROR',
          message: `Failed to process result: ${e.message}`
        });
      }
    }

  } catch (error: any) {
    self.postMessage({
      type: 'ERROR',
      message: `Error executing code: ${error.message || String(error)}`
    });
  }
}

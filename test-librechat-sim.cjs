const http = require('http');
const { EventEmitter } = require('events');

class LibreChatSimulator extends EventEmitter {
  constructor(baseUrl = 'http://localhost:8484') {
    super();
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.sseConnection = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async initialize() {
    this.log('Creating streamable-http transport');

    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'LibreChat-Simulator', version: '1.0' }
      },
      id: 1
    });

    try {
      const response = await this.makeRequest({
        method: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      if (response.statusCode === 200) {
        this.sessionId = response.headers['mcp-session-id'];
        this.log(`Initialize successful, session: ${this.sessionId}`);
        return true;
      } else {
        this.log(`Initialize failed: ${response.statusCode}`, 'error');
        this.log(response.body, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Initialize error: ${error.message}`, 'error');
      return false;
    }
  }

  async openSSEStream() {
    if (!this.sessionId) {
      this.log('No session ID, cannot open SSE stream', 'error');
      return false;
    }

    this.log('Opening SSE stream...');

    return new Promise((resolve, reject) => {
      let firstDataReceived = false;
      const timeout = setTimeout(() => {
        if (!firstDataReceived) {
          this.log('⏱️ No SSE data received after 5 seconds (stream is open but idle)', 'warn');
          resolve(true); // Still consider it successful if stream is open
        }
      }, 5000);

      const req = http.request({
        hostname: 'localhost',
        port: 8484,
        path: '/',
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'mcp-session-id': this.sessionId,
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        this.log(`SSE stream response: ${res.statusCode}`);
        this.log(`SSE headers: ${JSON.stringify(res.headers)}`);

        if (res.statusCode === 200) {
          this.sseConnection = res;

          res.on('data', (chunk) => {
            if (!firstDataReceived) {
              firstDataReceived = true;
              clearTimeout(timeout);
              this.log('📨 First SSE data received!');
            }
            const data = chunk.toString();
            this.log(`SSE chunk (${chunk.length} bytes): ${data.substring(0, 200)}`);
          });

          res.on('end', () => {
            clearTimeout(timeout);
            this.log('SSE stream disconnected', 'warn');
            this.emit('disconnect');
          });

          res.on('error', (error) => {
            clearTimeout(timeout);
            this.log(`SSE stream error: ${error.message}`, 'error');
            this.emit('error', error);
          });

          // Don't resolve immediately, wait for first data or timeout
        } else if (res.statusCode === 409) {
          this.log('Conflict: Another SSE stream already exists', 'error');
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            this.log(`Conflict response: ${body}`, 'error');
            reject(new Error('Conflict'));
          });
        } else {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            this.log(`SSE failed (${res.statusCode}): ${body}`, 'error');
            reject(new Error(`SSE failed: ${res.statusCode}`));
          });
        }
      });

      req.on('error', (error) => {
        this.log(`SSE request error: ${error.message}`, 'error');
        reject(error);
      });

      req.end();
    });
  }

  closeSSEStream() {
    if (this.sseConnection) {
      this.log('Closing SSE stream');
      this.sseConnection.destroy();
      this.sseConnection = null;
    }
  }

  async callTool(toolName, args) {
    if (!this.sessionId) {
      this.log('No session ID, cannot call tool', 'error');
      return null;
    }

    this.log(`Calling tool: ${toolName}`);

    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: Date.now()
    });

    try {
      const response = await this.makeRequest({
        method: 'POST',
        path: '/',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': this.sessionId,
          'Content-Length': Buffer.byteLength(body)
        }
      }, body);

      if (response.statusCode === 200) {
        // Parse SSE format
        const lines = response.body.split('\n');
        const dataLine = lines.find(line => line.startsWith('data:'));
        if (dataLine) {
          const data = JSON.parse(dataLine.substring(5).trim());
          this.log(`Tool result received`);
          return data.result;
        }
      } else {
        this.log(`Tool call failed: ${response.statusCode}`, 'error');
        this.log(response.body, 'error');
      }
    } catch (error) {
      this.log(`Tool call error: ${error.message}`, 'error');
    }
    return null;
  }

  makeRequest(options, body) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8484,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  async disconnect() {
    this.closeSSEStream();
    if (this.sessionId) {
      this.log('Disconnecting session');
      this.sessionId = null;
    }
  }
}

// テストシナリオ
async function runTests() {
  console.log('\n=== LibreChat Behavior Simulation ===\n');

  // Test 1: 正常な初期化とSSE接続
  console.log('\n--- Test 1: Normal initialization + SSE stream ---');
  const client1 = new LibreChatSimulator();

  if (await client1.initialize()) {
    try {
      await client1.openSSEStream();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ツール呼び出し
      const result = await client1.callTool('one_search', {
        query: 'test',
        max_results: 2
      });

      if (result) {
        console.log('✅ Tool call successful');
      }
    } catch (error) {
      console.log(`❌ Test 1 failed: ${error.message}`);
    } finally {
      await client1.disconnect();
    }
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: 複数SSE接続の衝突テスト
  console.log('\n--- Test 2: Multiple SSE stream conflict ---');
  const client2 = new LibreChatSimulator();

  if (await client2.initialize()) {
    try {
      // 最初のSSE接続
      await client2.openSSEStream();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2つ目のSSE接続を試行（Conflictになるはず）
      console.log('Attempting second SSE stream (should conflict)...');
      try {
        await client2.openSSEStream();
        console.log('❌ Second SSE stream should have been rejected!');
      } catch (error) {
        console.log('✅ Expected conflict:', error.message);
      }
    } finally {
      await client2.disconnect();
    }
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: 切断と再接続
  console.log('\n--- Test 3: Disconnect and reconnect ---');
  const client3 = new LibreChatSimulator();

  if (await client3.initialize()) {
    try {
      await client3.openSSEStream();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 切断
      client3.closeSSEStream();
      await new Promise(resolve => setTimeout(resolve, 500));

      // 再接続
      console.log('Reconnecting...');
      await client3.openSSEStream();
      console.log('✅ Reconnection successful');

    } catch (error) {
      console.log(`❌ Test 3 failed: ${error.message}`);
    } finally {
      await client3.disconnect();
    }
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: 同時複数クライアント
  console.log('\n--- Test 4: Multiple concurrent clients ---');
  const clientA = new LibreChatSimulator();
  const clientB = new LibreChatSimulator();

  try {
    if (await clientA.initialize() && await clientB.initialize()) {
      console.log(`Client A session: ${clientA.sessionId}`);
      console.log(`Client B session: ${clientB.sessionId}`);

      await Promise.all([
        clientA.openSSEStream(),
        clientB.openSSEStream()
      ]);

      console.log('✅ Multiple clients can connect simultaneously');

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.log(`❌ Test 4 failed: ${error.message}`);
  } finally {
    await clientA.disconnect();
    await clientB.disconnect();
  }

  console.log('\n=== Tests completed ===\n');
  process.exit(0);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// 実行
runTests().catch(console.error);

const http = require('http');

async function testSSE() {
  console.log('1. Initialize...');

  // 初期化
  const initBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'SSETest', version: '1.0' }
    },
    id: 1
  });

  const initResp = await makeRequest({
    method: 'POST',
    path: '/',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(initBody)
    }
  }, initBody);

  const sessionId = initResp.headers['mcp-session-id'];
  console.log(`   Session: ${sessionId}\n`);

  console.log('2. Test GET request (SSE)...');

  // GETリクエスト（SSEストリーム）
  const req = http.request({
    hostname: 'localhost',
    port: 8484,
    path: '/',
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
      'mcp-session-id': sessionId
    }
  }, (res) => {
    console.log(`   Response status: ${res.statusCode}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);

    if (res.statusCode === 200) {
      let dataCount = 0;

      res.on('data', (chunk) => {
        dataCount++;
        console.log(`   [Data ${dataCount}] ${chunk.toString().substring(0, 100)}...`);

        // 3つのデータチャンク受信したら終了
        if (dataCount >= 3) {
          console.log('\n   ✅ SSE working!');
          res.destroy();
          process.exit(0);
        }
      });

      res.on('error', (error) => {
        console.log(`   ❌ SSE error: ${error.message}`);
        process.exit(1);
      });

      // 10秒後にタイムアウト
      setTimeout(() => {
        console.log('\n   ⚠️ Timeout - no data received');
        res.destroy();
        process.exit(1);
      }, 10000);

    } else {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`   ❌ Error ${res.statusCode}: ${body}`);
        process.exit(1);
      });
    }
  });

  req.on('error', (error) => {
    console.log(`   ❌ Request error: ${error.message}`);
    process.exit(1);
  });

  req.end();
}

function makeRequest(options, body) {
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

testSSE().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});

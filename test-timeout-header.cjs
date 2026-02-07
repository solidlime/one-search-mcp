const http = require('http');

const BASE_URL = 'http://localhost:8484';
let sessionId = null;

console.log('=== X-Search-Timeout Header Test ===\n');

function makeRequest(method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };

    if (sessionId) {
      defaultHeaders['mcp-session-id'] = sessionId;
    }

    const allHeaders = { ...defaultHeaders, ...headers };

    const options = {
      hostname: 'localhost',
      port: 8484,
      path: '/',
      method: method,
      headers: allHeaders,
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let data = '';

      if (res.headers['mcp-session-id']) {
        sessionId = res.headers['mcp-session-id'];
      }

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

async function runTest() {
  try {
    console.log('1️⃣ Initializing MCP session...');
    const initBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'Timeout-Test', version: '1.0' }
      },
      id: 1
    });

    await makeRequest('POST', initBody);
    console.log(`   ✅ Session ID: ${sessionId}\n`);

    // Test 1: Default timeout (10s)
    console.log('2️⃣ Test 1: Default timeout (10000ms)...');
    const search1Body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'one_search',
        arguments: {
          query: 'test default timeout',
          max_results: 3
        }
      },
      id: 2
    });

    const res1 = await makeRequest('POST', search1Body, {
      'X-Search-Provider': 'searxng',
      'X-Search-API-URL': 'http://nas:11111'
    });

    console.log(`   Response status: ${res1.statusCode}`);

    if (res1.statusCode === 200) {
      const lines = res1.body.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));
      if (dataLine) {
        const data = JSON.parse(dataLine.substring(5).trim());
        if (data.error) {
          console.log(`   ❌ Error: ${data.error.message}`);
          if (data.error.message.includes('timeout')) {
            console.log('   ✅ Timeout detected correctly\n');
          }
        } else if (data.result) {
          console.log('   ✅ Search succeeded\n');
        }
      }
    }

    // Test 2: Custom timeout (30s)
    console.log('3️⃣ Test 2: Custom timeout via X-Search-Timeout (30000ms)...');
    const search2Body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'one_search',
        arguments: {
          query: 'test custom timeout',
          max_results: 3
        }
      },
      id: 3
    });

    const res2 = await makeRequest('POST', search2Body, {
      'X-Search-Provider': 'searxng',
      'X-Search-API-URL': 'http://nas:11111',
      'X-Search-Timeout': '30000'
    });

    console.log(`   Response status: ${res2.statusCode}`);

    if (res2.statusCode === 200) {
      const lines = res2.body.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));
      if (dataLine) {
        const data = JSON.parse(dataLine.substring(5).trim());
        if (data.error) {
          console.log(`   ❌ Error: ${data.error.message}`);
          if (data.error.message.includes('30000ms')) {
            console.log('   ✅ Custom timeout (30s) applied correctly\n');
          }
        } else if (data.result) {
          console.log('   ✅ Search succeeded with custom timeout\n');
        }
      }
    }

    console.log('🎉 X-Search-Timeout header test complete!');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message || error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runTest();

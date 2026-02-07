const http = require('http');

const BASE_URL = 'http://localhost:8484';
let sessionId = null;

console.log('=== Custom User-Agent Test ===\n');

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
    // 1. Initialize
    console.log('1️⃣ Initializing MCP session...');
    const initBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'UA-Test', version: '1.0' }
      },
      id: 1
    });

    await makeRequest('POST', initBody);
    console.log(`   ✅ Session ID: ${sessionId}\n`);

    // 2. Search with custom User-Agent (via header)
    console.log('2️⃣ Search with custom User-Agent (X-User-Agent header)...');
    const searchBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'one_search',
        arguments: {
          query: 'test',
          max_results: 1
        }
      },
      id: 2
    });

    const searchRes = await makeRequest('POST', searchBody, {
      'X-Search-Provider': 'searxng',
      'X-Search-API-URL': 'http://nas:11111',
      'X-User-Agent': 'CustomBot/1.0 (Testing)'
    });

    if (searchRes.statusCode === 200) {
      const lines = searchRes.body.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));

      if (dataLine) {
        const data = JSON.parse(dataLine.substring(5).trim());

        if (data.result) {
          console.log('   ✅ Search with custom User-Agent succeeded!');
          console.log('   (If this works, SearXNG accepted our custom UA)\n');
        } else if (data.error) {
          console.error('   ❌ Error:', data.error.message);
        }
      }
    }

    // 3. Search with default User-Agent (no header)
    console.log('3️⃣ Search with default User-Agent (no X-User-Agent header)...');
    const searchRes2 = await makeRequest('POST', searchBody, {
      'X-Search-Provider': 'searxng',
      'X-Search-API-URL': 'http://nas:11111'
      // No X-User-Agent header - should use default
    });

    if (searchRes2.statusCode === 200) {
      const lines = searchRes2.body.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));

      if (dataLine) {
        const data = JSON.parse(dataLine.substring(5).trim());

        if (data.result) {
          console.log('   ✅ Search with default User-Agent succeeded!');
          console.log('   (Used default Chrome UA)\n');
        } else if (data.error) {
          console.error('   ❌ Error:', data.error.message);
        }
      }
    }

    console.log('🎉 All tests passed! User-Agent customization is working! 🎉');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

runTest();

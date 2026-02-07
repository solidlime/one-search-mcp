const http = require('http');

const BASE_URL = 'http://localhost:8484';
let sessionId = null;

console.log('=== MCP SearXNG Search Test ===\n');

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
      
      // Capture session ID from response
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
        clientInfo: { name: 'SearXNG-Test', version: '1.0' }
      },
      id: 1
    });

    const initRes = await makeRequest('POST', initBody);
    console.log(`   ✅ Session ID: ${sessionId}\n`);

    // 2. Search with SearXNG
    console.log('2️⃣ Calling one_search with SearXNG...');
    const searchBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'one_search',
        arguments: {
          query: 'github',
          max_results: 3
        }
      },
      id: 2
    });

    const searchRes = await makeRequest('POST', searchBody, {
      'X-Search-Provider': 'searxng',
      'X-Search-API-URL': 'http://nas:11111'
    });

    console.log(`   Response status: ${searchRes.statusCode}`);

    if (searchRes.statusCode === 200) {
      // Parse SSE format
      const lines = searchRes.body.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));
      
      if (dataLine) {
        const data = JSON.parse(dataLine.substring(5).trim());
        
        if (data.result) {
          console.log('   ✅✅✅ SEARCH SUCCESS! ✅✅✅\n');
          const resultText = data.result.content[0].text;
          console.log('   Raw result:');
          console.log(resultText.substring(0, 500));
          console.log('\n   (User-Agent fix is working! 🎉)');
        } else if (data.error) {
          console.error('   ❌ MCP Error:', data.error.message);
        }
      }
    } else {
      console.error(`   ❌ HTTP ${searchRes.statusCode}`);
      console.error(`   Body: ${searchRes.body.substring(0, 500)}`);
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

runTest();

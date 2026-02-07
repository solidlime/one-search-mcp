const http = require('http');

const BASE_URL = 'http://localhost:8484';
const SEARXNG_URL = 'http://nas:11111';
let sessionId = null;

console.log('=== SearXNG Engine Test ===\n');

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

async function testEngine(engineName) {
  console.log(`\n🔍 Testing with engine: ${engineName}`);

  const searchBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'one_search',
      arguments: {
        query: 'test',
        max_results: 2,
        engines: engineName  // 特定のエンジンを指定
      }
    },
    id: Date.now()
  });

  try {
    const searchRes = await makeRequest('POST', searchBody, {
      'X-Search-Provider': 'searxng',
      'X-Search-API-URL': SEARXNG_URL
    });

    if (searchRes.statusCode === 200) {
      const lines = searchRes.body.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));

      if (dataLine) {
        const data = JSON.parse(dataLine.substring(5).trim());

        if (data.result) {
          const resultText = data.result.content[0].text;
          if (resultText.includes('Title:')) {
            console.log(`   ✅ ${engineName} - SUCCESS`);
            return true;
          } else {
            console.log(`   ❌ ${engineName} - No results`);
            console.log(`   Response: ${resultText.substring(0, 100)}`);
            return false;
          }
        } else if (data.error) {
          console.log(`   ❌ ${engineName} - ERROR: ${data.error.message}`);
          return false;
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ ${engineName} - Exception: ${error.message}`);
    return false;
  }

  return false;
}

async function runTest() {
  try {
    // Initialize
    console.log('1️⃣ Initializing...');
    const initBody = JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'Engine-Test', version: '1.0' }
      },
      id: 1
    });

    await makeRequest('POST', initBody);
    console.log(`   Session: ${sessionId}\n`);

    // Test different engines
    console.log('2️⃣ Testing individual engines...');
    const engines = [
      'duckduckgo',
      'bing',
      'qwant',
      'yahoo',
      'mojeek',
    ];

    const workingEngines = [];
    for (const engine of engines) {
      const works = await testEngine(engine);
      if (works) {
        workingEngines.push(engine);
      }
      await new Promise(r => setTimeout(r, 1000)); // 1秒待機
    }

    console.log('\n\n📊 Summary:');
    console.log(`Working engines: ${workingEngines.join(', ')}`);
    console.log(`\n💡 Recommendation: Use engines="${workingEngines[0]}" in your config`);

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

runTest();

const http = require('http');

async function test() {
  // Initialize
  console.log('1️⃣ Initialize...');
  const initBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'NodeTest', version: '1.0' }
    },
    id: 1
  });

  const initReq = await makeRequest({
    method: 'POST',
    path: '/',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(initBody)
    }
  }, initBody);

  const sessionId = initReq.headers['mcp-session-id'];
  console.log(`✅ Session ID: ${sessionId}\n`);

  // Search
  console.log('2 ️⃣ Search...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const searchBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'one_search',
      arguments: { query: 'github', max_results: 2 }
    },
    id: 2
  });

  const searchReq = await makeRequest({
    method: 'POST',
    path: '/',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
      'Content-Length': Buffer.byteLength(searchBody)
    }
  }, searchBody);

  if (searchReq.statusCode === 200) {
    // Parse SSE format: "event: message\ndata: {...}\n\n"
    const lines = searchReq.body.split('\n');
    const dataLine = lines.find(line => line.startsWith('data:'));
    if (dataLine) {
      const data = JSON.parse(dataLine.substring(5).trim());
      console.log('✅✅✅ SUCCESS! ✅✅✅\n');
      console.log(data.result.content[0].text.substring(0, 500));
    } else {
      console.log('❌ No data in SSE response');
      console.log(searchReq.body);
    }
  } else {
    console.log(`❌ Error: ${searchReq.statusCode}`);
    console.log(searchReq.body);
  }
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

test().catch(console.error);

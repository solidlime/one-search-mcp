const http = require('http');
const url = require('url');

const SEARXNG_URL = 'http://nas:11111';
const TEST_QUERY = 'github';

console.log('=== SearXNG API Test ===\n');
console.log(`Target: ${SEARXNG_URL}`);
console.log(`Query: "${TEST_QUERY}"\n`);

async function testSearXNG() {
  const config = {
    q: TEST_QUERY,
    pageno: 1,
    categories: 'general',
    format: 'json',
    safesearch: 0,
    language: 'auto',
    engines: 'all',
    time_range: '',
  };

  const endpoint = `${SEARXNG_URL}/search`;
  const queryParams = url.format({ query: config });
  const fullUrl = `${endpoint}${queryParams}`;

  console.log(`1️⃣ Requesting: ${fullUrl}\n`);

  const parsedUrl = new URL(fullUrl);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout (10s)'));
    }, 10000);

    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      clearTimeout(timeout);
      
      console.log(`✅ Response status: ${res.statusCode}`);
      console.log(`✅ Response headers:`, res.headers);
      console.log('');

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ Valid JSON response`);
          console.log(`✅ Results count: ${json.results?.length || 0}`);
          
          if (json.results && json.results.length > 0) {
            console.log('\n📋 First result:');
            console.log(`   Title: ${json.results[0].title}`);
            console.log(`   URL: ${json.results[0].url}`);
            console.log(`   Content: ${json.results[0].content?.substring(0, 100)}...`);
          }
          
          resolve({ success: true, results: json.results });
        } catch (err) {
          console.error(`❌ JSON parse error: ${err.message}`);
          console.error(`❌ Response body (first 500 chars):\n${data.substring(0, 500)}`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`❌ Request error: ${err.message}`);
      console.error(`❌ Error type: ${err.name}`);
      console.error(`❌ Error code: ${err.code}`);
      if (err.cause) {
        console.error(`❌ Cause: ${err.cause}`);
      }
      reject(err);
    });

    req.end();
  });
}

// Run test
testSearXNG()
  .then((result) => {
    console.log('\n🎉🎉🎉 Test PASSED! 🎉🎉🎉');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥💥💥 Test FAILED! 💥💥💥');
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });

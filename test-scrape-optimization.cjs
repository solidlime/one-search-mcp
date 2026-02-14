#!/usr/bin/env node

/**
 * Test script to demonstrate scrape optimization effects
 * Compares before/after implementation of readability and maxLength
 */

const testUrl = 'https://en.wikipedia.org/wiki/Artificial_intelligence';

async function testScrape(options) {
  const response = await fetch('http://localhost:8000/api/tools/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: testUrl,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();

  // Debug: log response structure
  if (process.env.DEBUG) {
    console.log('Response structure:', JSON.stringify(result, null, 2).substring(0, 500));
  }

  return result;
}

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function analyzeResult(result, label) {
  // API response structure: { url, success, data: { success, markdown, ... } }
  const markdown = result.data?.markdown || '';
  const contentLength = markdown.length;
  const contentBytes = new TextEncoder().encode(markdown).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: ${label}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Content Length: ${contentLength.toLocaleString()} characters`);
  console.log(`Content Size: ${formatBytes(contentBytes)}`);
  console.log(`First 200 chars:\n${markdown.substring(0, 200)}...`);
  console.log(`${'='.repeat(60)}\n`);

  return { contentLength, contentBytes };
}

async function runTests() {
  console.log('\n🧪 Testing Scrape Optimization\n');
  console.log(`Target URL: ${testUrl}\n`);

  try {
    // Test 1: Without readability (onlyMainContent=false)
    console.log('📝 Test 1: Full HTML → Markdown (onlyMainContent=false)');
    const result1 = await testScrape({
      formats: ['markdown'],
      onlyMainContent: false,
    });
    const stats1 = analyzeResult(result1, 'Without Readability');

    // Test 2: With readability (onlyMainContent=true, default)
    console.log('📝 Test 2: Main Content Only (onlyMainContent=true)');
    const result2 = await testScrape({
      formats: ['markdown'],
      onlyMainContent: true,
    });
    const stats2 = analyzeResult(result2, 'With Readability');

    // Test 3: With maxLength limit
    console.log('📝 Test 3: With maxLength=10000');
    const result3 = await testScrape({
      formats: ['markdown'],
      onlyMainContent: true,
      maxLength: 10000,
    });
    const stats3 = analyzeResult(result3, 'With maxLength Limit');

    // Test 4: Multiple formats (to see screenshot handling)
    console.log('📝 Test 4: Multiple formats (markdown + screenshot)');
    const result4 = await testScrape({
      formats: ['markdown', 'screenshot', 'links'],
      onlyMainContent: true,
      maxLength: 5000,
    });
    const stats4 = analyzeResult(result4, 'Multiple Formats');

    // Summary
    console.log('\n📊 SUMMARY\n');
    console.log('┌─────────────────────────────┬──────────────┬──────────────┐');
    console.log('│ Test Scenario               │ Characters   │ Size         │');
    console.log('├─────────────────────────────┼──────────────┼──────────────┤');
    console.log(
      `│ Without Readability         │ ${stats1.contentLength.toLocaleString().padStart(12)} │ ${formatBytes(stats1.contentBytes).padStart(12)} │`,
    );
    console.log(
      `│ With Readability            │ ${stats2.contentLength.toLocaleString().padStart(12)} │ ${formatBytes(stats2.contentBytes).padStart(12)} │`,
    );
    console.log(
      `│ With maxLength=10000        │ ${stats3.contentLength.toLocaleString().padStart(12)} │ ${formatBytes(stats3.contentBytes).padStart(12)} │`,
    );
    console.log(
      `│ Multiple Formats (max=5000) │ ${stats4.contentLength.toLocaleString().padStart(12)} │ ${formatBytes(stats4.contentBytes).padStart(12)} │`,
    );
    console.log('└─────────────────────────────┴──────────────┴──────────────┘');

    // Calculate reduction
    const reduction1to2 = ((1 - stats2.contentBytes / stats1.contentBytes) * 100).toFixed(1);
    const reduction1to3 = ((1 - stats3.contentBytes / stats1.contentBytes) * 100).toFixed(1);
    const reduction1to4 = ((1 - stats4.contentBytes / stats1.contentBytes) * 100).toFixed(1);

    console.log('\n💡 Optimization Effects:');
    console.log(`   Readability alone: -${reduction1to2}% size reduction`);
    console.log(`   With maxLength=10000: -${reduction1to3}% size reduction`);
    console.log(`   With maxLength=5000 + multi-format: -${reduction1to4}% size reduction`);

    console.log('\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('\n💡 Make sure the API server is running:');
    console.error('   npm run api\n');
    process.exit(1);
  }
}

runTests();

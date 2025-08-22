#!/usr/bin/env node

const https = require('https');
const querystring = require('querystring');

const username = 'mike@emke.com';
const password = 'cope123123A!';

function makeRequest(url, method, headers, body, followRedirects = true) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      // Handle redirects
      if (followRedirects && (res.statusCode === 301 || res.statusCode === 302)) {
        const location = res.headers.location;
        if (location) {
          console.log(`Redirecting to: ${location}`);
          // Follow redirect with GET method
          return makeRequest(location, 'GET', {
            'User-Agent': headers['User-Agent'],
            'Accept': headers['Accept'],
            'Accept-Language': headers['Accept-Language'],
            'Referer': url
          }, null, followRedirects).then(resolve).catch(reject);
        }
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

async function testCodeSubmission() {
  console.log('Testing code submission (working method)...');
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.freshcope.com/',
  };
  
  const body = `username=${username}&password=${password}&code=TEST1-2345-6789`;
  
  try {
    // First try without following redirects to see the raw response
    const response = await makeRequest('https://www.freshcope.com/rewards/earn', 'POST', headers, body, false);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response length: ${response.body.length}`);
    console.log(`Redirect location: ${response.headers.location || 'none'}`);
    console.log(`First 500 chars: ${response.body.substring(0, 500)}`);
    
    // Check if login worked
    if (response.statusCode === 301 || response.statusCode === 302) {
      console.log(`🔄 REDIRECT to: ${response.headers.location}`);
    } else if (response.body.length < 5000) {
      console.log('✅ SHORT RESPONSE - likely success page');
    } else if (response.body.length > 15000 && response.body.toLowerCase().includes('home page')) {
      console.log('❌ LONG RESPONSE - redirected to homepage (login failed)');
    } else {
      console.log('? MEDIUM RESPONSE - unclear result');
    }
    
    return response;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function testPointsFetching() {
  console.log('\nTesting points fetching with same method...');
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.freshcope.com/',
  };
  
  const body = `username=${username}&password=${password}`;
  
  try {
    // First try without following redirects to see the raw response
    const response = await makeRequest('https://www.freshcope.com/rewards/redeem', 'POST', headers, body, false);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response length: ${response.body.length}`);
    console.log(`Redirect location: ${response.headers.location || 'none'}`);
    console.log(`First 500 chars: ${response.body.substring(0, 500)}`);
    
    if (response.statusCode === 301 || response.statusCode === 302) {
      console.log(`🔄 REDIRECT to: ${response.headers.location}`);
    }
    
    // Look for points
    const patterns = [
      /(?:current\s*balance|available\s*points|your\s*points)[:\s]*(\d+)/i,
      /(\d+)\s*(?:points?\s*available|points?\s*balance)/i,
      /balance[:\s]*(\d+)/i,
      /you\s*have\s*(\d+)\s*points?/i,
      /(\d+)\s*points?/i
    ];
    
    for (const pattern of patterns) {
      const match = response.body.match(pattern);
      if (match && match[1]) {
        const points = parseInt(match[1]);
        if (!isNaN(points)) {
          console.log(`✅ FOUND POINTS: ${points}`);
          return points;
        }
      }
    }
    
    console.log('❌ NO POINTS FOUND');
    return null;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function testMainPage() {
  console.log('Testing main page access...');
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  };
  
  try {
    const response = await makeRequest('https://www.freshcope.com/', 'GET', headers, null, false);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response length: ${response.body.length}`);
    console.log(`Redirect location: ${response.headers.location || 'none'}`);
    console.log(`Contains "rewards": ${response.body.toLowerCase().includes('rewards')}`);
    console.log(`Contains "earn": ${response.body.toLowerCase().includes('earn')}`);
    console.log(`Contains "redeem": ${response.body.toLowerCase().includes('redeem')}`);
    
    return response;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

async function main() {
  console.log('=== FreshCope Authentication Test ===\n');
  
  // Test main page first
  await testMainPage();
  
  // Test the working code submission method first
  const codeResult = await testCodeSubmission();
  
  // Test points fetching with the same approach
  const points = await testPointsFetching();
  
  console.log('\n=== Summary ===');
  console.log(`Code submission: ${codeResult ? 'Working' : 'Failed'}`);
  console.log(`Points fetching: ${points !== null ? `Found ${points} points` : 'Failed'}`);
}

main().catch(console.error);
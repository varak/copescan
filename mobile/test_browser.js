#!/usr/bin/env node

const puppeteer = require('puppeteer');

const username = 'mike@emke.com';
const password = 'cope123123A!';

async function testWithBrowser() {
  console.log('=== Testing FreshCope with Browser Automation ===');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to match mobile
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
    
    console.log('1. Navigating to main page...');
    const response = await page.goto('https://www.freshcope.com/', { waitUntil: 'networkidle0' });
    console.log(`Status: ${response.status()}`);
    console.log(`URL: ${page.url()}`);
    
    if (response.status() !== 200) {
      console.log('❌ Main page failed');
      return;
    }
    
    // Check what's on the page - we're now on gtc.freshcope.com with JWT
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Check if this is a login page
    const content = await page.content();
    console.log(`Page contains "login": ${content.toLowerCase().includes('login')}`);
    console.log(`Page contains "username": ${content.toLowerCase().includes('username')}`);
    console.log(`Page contains "password": ${content.toLowerCase().includes('password')}`);
    
    // Try to find and fill login form on the JWT login page
    console.log('\n2. Looking for login form on JWT page...');
    const hasUsernameField = await page.$('input[name="username"], input[name="email"], input[type="email"]') !== null;
    const hasPasswordField = await page.$('input[name="password"], input[type="password"]') !== null;
    
    console.log(`Has username field: ${hasUsernameField}`);
    console.log(`Has password field: ${hasPasswordField}`);
    
    if (hasUsernameField && hasPasswordField) {
      console.log('\n3. Attempting login on JWT page...');
      
      // Fill in credentials
      await page.type('input[name="username"], input[name="email"], input[type="email"]', username);
      await page.type('input[name="password"], input[type="password"]', password);
      
      // Submit form
      await page.click('input[type="submit"], button[type="submit"], button');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      console.log(`After login URL: ${page.url()}`);
      
      // Now try to navigate to rewards pages
      console.log('\n4. Trying to access rewards pages...');
      
      // Try rewards/earn first
      try {
        const earnResponse = await page.goto('https://www.freshcope.com/rewards/earn', { waitUntil: 'networkidle0' });
        console.log(`Earn page status: ${earnResponse.status()}`);
        console.log(`Earn page URL: ${page.url()}`);
      } catch (earnError) {
        console.log(`Earn page error: ${earnError.message}`);
      }
      
      // Try rewards/redeem
      try {
        const redeemResponse = await page.goto('https://www.freshcope.com/rewards/redeem', { waitUntil: 'networkidle0' });
        console.log(`Redeem page status: ${redeemResponse.status()}`);
        console.log(`Redeem page URL: ${page.url()}`);
        
        if (redeemResponse.status() === 200) {
          const redeemContent = await page.content();
          
          // Look for points
          const patterns = [
            /(?:current\s*balance|available\s*points|your\s*points)[:\s]*(\d+)/i,
            /(\d+)\s*(?:points?\s*available|points?\s*balance)/i,
            /balance[:\s]*(\d+)/i,
            /you\s*have\s*(\d+)\s*points?/i,
            /(\d+)\s*points?/i
          ];
          
          for (const pattern of patterns) {
            const match = redeemContent.match(pattern);
            if (match && match[1]) {
              const points = parseInt(match[1]);
              if (!isNaN(points)) {
                console.log(`✅ FOUND POINTS: ${points}`);
                return points;
              }
            }
          }
          
          console.log('❌ No points found in redeem page');
          console.log('Redeem page snippet:', redeemContent.substring(0, 500));
        }
      } catch (redeemError) {
        console.log(`Redeem page error: ${redeemError.message}`);
      }
    } else {
      console.log('❌ No login form found on JWT page');
    }
    
  } catch (error) {
    console.error('Browser automation error:', error);
  } finally {
    await browser.close();
  }
  
  return null;
}

async function main() {
  const points = await testWithBrowser();
  console.log(`\n=== Result: ${points !== null ? `${points} points found` : 'Failed to get points'} ===`);
}

main().catch(console.error);
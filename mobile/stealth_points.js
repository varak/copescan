#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const username = 'mike@emke.com';
const password = 'cope123123A!';

async function stealthFetchPoints() {
  console.log('=== Stealth Points Fetcher ===');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set realistic viewport for mobile
    await page.setViewport({ width: 390, height: 844 });
    
    console.log('1. Navigating to main page...');
    await page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log(`Current URL: ${page.url()}`);
    
    // Wait a bit like a human
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if we can access the rewards/earn page directly
    console.log('2. Trying to access rewards/earn...');
    try {
      await page.goto('https://www.freshcope.com/rewards/earn', { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      console.log(`Earn page URL: ${page.url()}`);
      
      // Look for login form
      const hasForm = await page.$('form') !== null;
      console.log(`Has form: ${hasForm}`);
      
      // Check what's actually on the page
      const pageContent = await page.content();
      console.log('Page contains login:', pageContent.toLowerCase().includes('login'));
      console.log('Page contains username:', pageContent.toLowerCase().includes('username'));
      console.log('Page contains password:', pageContent.toLowerCase().includes('password'));
      console.log('Page contains captcha:', pageContent.toLowerCase().includes('captcha'));
      console.log('Page contains puzzle:', pageContent.toLowerCase().includes('puzzle'));
      console.log('Page contains slider:', pageContent.toLowerCase().includes('slider'));
      console.log('Page contains bot:', pageContent.toLowerCase().includes('bot'));
      console.log('Page length:', pageContent.length);
      
      // Check for CAPTCHA elements
      const hasCaptcha = await page.$('.captcha, [class*="captcha"], [id*="captcha"], [class*="puzzle"], [id*="puzzle"]') !== null;
      console.log(`Has CAPTCHA element: ${hasCaptcha}`);
      
      // Since page contains "captcha", take a screenshot regardless
      if (pageContent.toLowerCase().includes('captcha')) {
        console.log('🤖 CAPTCHA DETECTED! Website is showing anti-bot challenge.');
        
        // Take a screenshot to see what we're dealing with
        await page.screenshot({ path: 'captcha_screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved as captcha_screenshot.png');
        
        // Look for common CAPTCHA providers
        const cloudflare = pageContent.toLowerCase().includes('cloudflare');
        const recaptcha = pageContent.toLowerCase().includes('recaptcha');
        const hcaptcha = pageContent.toLowerCase().includes('hcaptcha');
        
        console.log(`Cloudflare: ${cloudflare}`);
        console.log(`reCAPTCHA: ${recaptcha}`);
        console.log(`hCaptcha: ${hcaptcha}`);
        
        return null; // Can't proceed without solving CAPTCHA
      }
      
      if (hasCaptcha) {
        console.log('🤖 CAPTCHA ELEMENT DETECTED!');
        return null;
      }
      
      if (hasForm) {
        console.log('3. Filling login form...');
        
        // Find and fill username field
        const usernameField = await page.$('input[name="username"], input[type="email"]');
        if (usernameField) {
          await usernameField.type(username, { delay: 100 });
        }
        
        // Find and fill password field  
        const passwordField = await page.$('input[name="password"], input[type="password"]');
        if (passwordField) {
          await passwordField.type(password, { delay: 100 });
        }
        
        // Submit the form
        await page.click('input[type="submit"], button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        
        console.log(`After login URL: ${page.url()}`);
        
        // Now try to get points
        console.log('4. Accessing rewards/redeem for points...');
        await page.goto('https://www.freshcope.com/rewards/redeem', { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        const content = await page.content();
        
        // Look for points
        const patterns = [
          /(?:current\s*balance|available\s*points|your\s*points)[:\s]*(\d+)/i,
          /(\d+)\s*(?:points?\s*available|points?\s*balance)/i,
          /balance[:\s]*(\d+)/i,
          /you\s*have\s*(\d+)\s*points?/i,
          /(\d+)\s*points?/i
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            const points = parseInt(match[1]);
            if (!isNaN(points)) {
              console.log(`🎉 SUCCESS! Found real points: ${points}`);
              return points;
            }
          }
        }
        
        console.log('❌ No points found in redeem page');
        console.log('Page snippet:', content.substring(0, 500));
      }
    } catch (earnError) {
      console.log(`Error accessing earn page: ${earnError.message}`);
    }
    
  } catch (error) {
    console.error('Stealth browser error:', error.message);
  } finally {
    await browser.close();
  }
  
  return null;
}

async function main() {
  const points = await stealthFetchPoints();
  console.log(`\n=== Final Result: ${points !== null ? `${points} points` : 'Failed to get points'} ===`);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { stealthFetchPoints };
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
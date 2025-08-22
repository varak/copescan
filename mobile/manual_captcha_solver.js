#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class ManualCaptchaSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false, // Show browser so user can solve manually
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
  }

  async waitForManualSolve(url) {
    console.log(`🌐 Opening browser to: ${url}`);
    console.log('🙏 Please solve the CAPTCHA manually in the browser window...');
    
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for CAPTCHA to be solved by checking if page content changes
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const content = await this.page.content();
      const currentUrl = this.page.url();
      
      // Check if CAPTCHA was solved
      if (!content.toLowerCase().includes('captcha') || 
          content.toLowerCase().includes('success') ||
          content.toLowerCase().includes('verified') ||
          currentUrl !== url) {
        console.log('✅ CAPTCHA appears to be solved! Continuing...');
        return true;
      }
      
      attempts++;
      console.log(`⏳ Still waiting for CAPTCHA to be solved... (${attempts}/${maxAttempts})`);
    }
    
    console.log('❌ Timeout waiting for CAPTCHA to be solved');
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Export for use in other modules
module.exports = { ManualCaptchaSolver };

// Test if run directly
async function test() {
  const solver = new ManualCaptchaSolver();
  await solver.init();
  
  try {
    const solved = await solver.waitForManualSolve('https://www.freshcope.com/rewards/earn');
    console.log(`Manual CAPTCHA solving result: ${solved ? 'SUCCESS' : 'FAILED'}`);
  } finally {
    // Don't close immediately so user can see result
    console.log('Press Ctrl+C to close browser...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
  }
}

if (require.main === module) {
  test().catch(console.error);
}
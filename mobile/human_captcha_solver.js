#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class HumanCaptchaSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false,
      devtools: false, // Disable dev tools to avoid detection
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic mobile viewport
    await this.page.setViewport({ width: 390, height: 844 });
    
    // Anti-detection measures
    await this.page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      delete Object.getPrototypeOf(navigator).webdriver;
      
      // Mock realistic properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin' },
          { name: 'Chrome PDF Viewer' },
          { name: 'Native Client' }
        ],
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Mock screen properties like a real mobile device
      Object.defineProperty(screen, 'width', { get: () => 390 });
      Object.defineProperty(screen, 'height', { get: () => 844 });
      Object.defineProperty(screen, 'availWidth', { get: () => 390 });
      Object.defineProperty(screen, 'availHeight', { get: () => 844 });
      
      // Hide automation indicators
      window.chrome = {
        runtime: {}
      };
      
      // Add realistic timing
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = function(fn, delay) {
        return originalSetTimeout(fn, delay + Math.random() * 50);
      };
    });
    
    // Set realistic mobile user agent
    await this.page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1');
    
    // Add realistic headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    });
  }

  // Add random human-like delays
  async humanDelay(min = 500, max = 2000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Move mouse like a human with slight wobbles
  async humanMouseMove(x, y, options = {}) {
    const steps = options.steps || Math.floor(Math.random() * 10) + 15;
    
    // Add slight random offset to make it more human
    const finalX = x + (Math.random() - 0.5) * 5;
    const finalY = y + (Math.random() - 0.5) * 5;
    
    await this.page.mouse.move(finalX, finalY, { steps });
    
    // Small random pause after movement
    await this.humanDelay(100, 400);
  }

  async navigateAndSolveManually(url) {
    console.log(`🌐 Opening browser to: ${url}`);
    console.log('👤 Using MAXIMUM stealth mode to avoid detection...');
    
    // Navigate with random delay
    await this.humanDelay(1000, 3000);
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait like a human reading the page
    await this.humanDelay(2000, 5000);
    
    // Take a screenshot for analysis
    await this.page.screenshot({ path: 'stealth_page.png', fullPage: true });
    
    const content = await this.page.content();
    
    if (content.toLowerCase().includes('captcha')) {
      console.log('🤖 CAPTCHA detected!');
      console.log('🙏 PLEASE SOLVE THE CAPTCHA MANUALLY - I will wait...');
      console.log('⚠️  IMPORTANT: Solve it SLOWLY and NATURALLY to avoid detection!');
      console.log('⏱️  Take your time - at least 10-15 seconds');
      
      // Wait for manual solving
      return await this.waitForManualSolve();
    }
    
    console.log('✅ No CAPTCHA detected');
    return true;
  }

  async waitForManualSolve() {
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const content = await this.page.content();
        const currentUrl = this.page.url();
        
        // Check for success indicators
        if (!content.toLowerCase().includes('captcha') || 
            content.toLowerCase().includes('success') ||
            content.toLowerCase().includes('verified') ||
            content.toLowerCase().includes('dashboard') ||
            currentUrl.includes('dashboard') ||
            currentUrl.includes('account')) {
          console.log('✅ CAPTCHA appears to be solved successfully!');
          return true;
        }
        
        // Check for error messages
        if (content.toLowerCase().includes('unusual activity') ||
            content.toLowerCase().includes('detected') ||
            content.toLowerCase().includes('blocked')) {
          console.log('❌ Still showing bot detection message...');
          console.log('💡 Try solving even more slowly and naturally');
        }
        
        attempts++;
        if (attempts % 6 === 0) { // Every 30 seconds
          console.log(`⏳ Still waiting for CAPTCHA... (${Math.floor(attempts/12)} minutes elapsed)`);
        }
        
      } catch (e) {
        console.log('Error checking page status:', e.message);
      }
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

// Test function
async function test() {
  const solver = new HumanCaptchaSolver();
  await solver.init();
  
  try {
    const solved = await solver.navigateAndSolveManually('https://www.freshcope.com/rewards/earn');
    
    if (solved) {
      console.log('🎉 SUCCESS! CAPTCHA solved, proceeding with login...');
      
      // Now try to login
      const usernameField = await solver.page.$('input[name="username"], input[type="email"]');
      if (usernameField) {
        console.log('Filling username...');
        await solver.humanDelay(1000, 2000);
        await usernameField.type('mike@emke.com', { delay: 150 });
      }
      
      const passwordField = await solver.page.$('input[name="password"], input[type="password"]');
      if (passwordField) {
        console.log('Filling password...');
        await solver.humanDelay(500, 1500);
        await passwordField.type('cope123123A!', { delay: 120 });
      }
      
      // Submit with human delay
      await solver.humanDelay(1000, 3000);
      await solver.page.click('input[type="submit"], button[type="submit"]');
      
      console.log('Login submitted! Waiting for result...');
      await solver.humanDelay(5000, 8000);
      
      const finalUrl = solver.page.url();
      console.log(`Final URL: ${finalUrl}`);
      
    } else {
      console.log('❌ CAPTCHA solving failed or timed out');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('Press Ctrl+C to close browser...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
  }
}

module.exports = { HumanCaptchaSolver };

if (require.main === module) {
  test().catch(console.error);
}
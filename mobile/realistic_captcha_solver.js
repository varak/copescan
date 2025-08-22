#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class RealisticCaptchaSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false,
      devtools: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--no-first-run'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
    
    // Anti-detection
    await this.page.evaluateOnNewDocument(() => {
      delete Object.getPrototypeOf(navigator).webdriver;
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    await this.page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1');
  }

  // Human-like random delay
  async humanDelay(min = 500, max = 2000) {
    const delay = Math.random() * (max - min) + min;
    console.log(`⏳ Human delay: ${Math.round(delay)}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Move mouse in a natural human path with slight curves
  async humanMouseMove(fromX, fromY, toX, toY, durationMs = 1000) {
    const steps = Math.floor(durationMs / 16); // ~60fps
    const stepDelay = durationMs / steps;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      // Add slight curve to the movement (bezier-like)
      const curve = Math.sin(progress * Math.PI) * 20 * Math.random();
      
      const currentX = fromX + (toX - fromX) * progress + curve * (Math.random() - 0.5);
      const currentY = fromY + (toY - fromY) * progress + curve * (Math.random() - 0.5);
      
      await this.page.mouse.move(currentX, currentY);
      await new Promise(resolve => setTimeout(resolve, stepDelay + Math.random() * 10));
    }
  }

  async solveCaptchaLikeHuman() {
    console.log('🤖 Looking for CAPTCHA elements...');
    
    // Wait for page to fully load
    await this.humanDelay(2000, 4000);
    
    // Look for iframe containing CAPTCHA
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) {
      console.log('❌ No iframes found');
      return false;
    }
    
    console.log(`Found ${iframes.length} iframe(s)`);
    
    // Get iframe position
    const iframeBox = await iframes[0].boundingBox();
    console.log(`Iframe position: ${JSON.stringify(iframeBox)}`);
    
    // Wait for iframe to load
    await this.humanDelay(1000, 2000);
    
    try {
      const frame = await iframes[0].contentFrame();
      if (!frame) {
        console.log('❌ Cannot access iframe content');
        return false;
      }
      
      // Look for slider element in iframe
      const sliderSelectors = [
        '[class*="slider"]',
        '.captcha-slider', 
        '[class*="drag"]',
        '[draggable="true"]',
        'canvas'
      ];
      
      let sliderElement = null;
      let sliderBox = null;
      
      for (const selector of sliderSelectors) {
        sliderElement = await frame.$(selector);
        if (sliderElement) {
          sliderBox = await sliderElement.boundingBox();
          console.log(`✅ Found slider with ${selector}: ${JSON.stringify(sliderBox)}`);
          break;
        }
      }
      
      if (!sliderElement || !sliderBox) {
        console.log('❌ No slider element found in iframe');
        return false;
      }
      
      // Calculate absolute position (iframe + element)
      const sliderCenterX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
      const sliderCenterY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
      
      console.log(`🎯 Target position: ${sliderCenterX}, ${sliderCenterY}`);
      
      // Simulate human behavior:
      
      // 1. Start from a random position like a human would
      const startX = Math.random() * 200 + 100;
      const startY = Math.random() * 200 + 200;
      await this.page.mouse.move(startX, startY);
      
      console.log('👤 Step 1: Moving mouse to CAPTCHA area like a human...');
      await this.humanDelay(1000, 2000); // Think time
      
      // 2. Move to slider with natural human movement
      await this.humanMouseMove(startX, startY, sliderCenterX, sliderCenterY, 1500);
      
      console.log('👤 Step 2: Hovering over slider (you should see it react)...');
      await this.humanDelay(500, 1200); // Hover time
      
      // 3. Click down (start dragging)
      console.log('👤 Step 3: Clicking down on slider...');
      await this.page.mouse.down();
      
      // 4. IMMEDIATELY start dragging (no delay to prevent reload)
      console.log('👤 Step 4: Dragging puzzle piece to the right...');
      
      const dragEndX = sliderCenterX + 250; // Drag distance
      const dragStartTime = Date.now();
      
      // Drag with variable speed like a human (slower at start/end, faster in middle)
      await this.humanMouseMove(sliderCenterX, sliderCenterY, dragEndX, sliderCenterY, 2000);
      
      const dragDuration = Date.now() - dragStartTime;
      console.log(`👤 Drag completed in ${dragDuration}ms (human-like timing)`);
      
      // 5. Release mouse
      console.log('👤 Step 5: Releasing mouse...');
      await this.page.mouse.up();
      
      // 6. Wait for validation like a human would
      console.log('👤 Step 6: Waiting for CAPTCHA validation...');
      await this.humanDelay(2000, 4000);
      
      // Check if solved
      const content = await this.page.content();
      if (!content.toLowerCase().includes('captcha') || 
          content.toLowerCase().includes('success') ||
          content.toLowerCase().includes('verified')) {
        console.log('🎉 CAPTCHA solved successfully!');
        return true;
      } else {
        console.log('❌ CAPTCHA not solved, may need manual intervention');
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error during CAPTCHA solving: ${error.message}`);
      return false;
    }
  }

  async navigateAndSolve(url) {
    console.log(`🌐 Starting at main FreshCope site...`);
    
    // First go to the main site to get the JWT redirect
    await this.page.goto('https://www.freshcope.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log(`🔄 Current URL after redirect: ${this.page.url()}`);
    
    // Check if we got redirected to the JWT login page
    if (this.page.url().includes('gtc.freshcope.com')) {
      console.log('✅ Got redirected to JWT login page - this is correct flow');
      
      const content = await this.page.content();
      if (content.toLowerCase().includes('captcha')) {
        console.log('🔍 CAPTCHA detected on JWT login page, attempting human-like solving...');
        const solved = await this.solveCaptchaLikeHuman();
        
        if (solved) {
          console.log('🎉 CAPTCHA solved! Now proceeding with login...');
          return await this.performLogin();
        }
        return false;
      } else {
        console.log('✅ No CAPTCHA on JWT page, proceeding with login...');
        return await this.performLogin();
      }
    } else {
      console.log('❌ Did not get expected JWT redirect, trying direct navigation...');
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const content = await this.page.content();
      if (content.toLowerCase().includes('captcha')) {
        console.log('🔍 CAPTCHA detected, attempting human-like solving...');
        return await this.solveCaptchaLikeHuman();
      }
    }
    
    return true;
  }

  async performLogin() {
    console.log('🔐 Attempting to login...');
    
    await this.humanDelay(1000, 2000);
    
    // Look for username/email field
    const usernameField = await this.page.$('input[name="username"], input[type="email"], input[id*="email"], input[id*="user"]');
    if (usernameField) {
      console.log('📧 Filling username field...');
      await this.humanDelay(500, 1000);
      await usernameField.type('mike@emke.com', { delay: 100 + Math.random() * 50 });
    }
    
    // Look for password field
    const passwordField = await this.page.$('input[name="password"], input[type="password"], input[id*="pass"]');
    if (passwordField) {
      console.log('🔑 Filling password field...');
      await this.humanDelay(500, 1000);
      await passwordField.type('cope123123A!', { delay: 80 + Math.random() * 40 });
    }
    
    // Submit form
    await this.humanDelay(1000, 2000);
    console.log('🚀 Submitting login form...');
    
    const submitButton = await this.page.$('input[type="submit"], button[type="submit"], button:contains("Login"), button:contains("Sign In")');
    if (submitButton) {
      await submitButton.click();
    } else {
      // Try pressing Enter
      await this.page.keyboard.press('Enter');
    }
    
    // Wait for login to complete
    await this.humanDelay(3000, 5000);
    
    console.log(`🏁 Login completed, current URL: ${this.page.url()}`);
    return true;
  }

  async fetchPoints() {
    console.log('🎯 Navigating to rewards page to get points...');
    
    // Try to navigate to rewards/redeem page
    try {
      await this.page.goto('https://www.freshcope.com/rewards/redeem', { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });
      
      console.log(`📍 Rewards page URL: ${this.page.url()}`);
      
      await this.humanDelay(2000, 4000);
      
      const content = await this.page.content();
      
      // Look for points using various patterns
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
          if (!isNaN(points) && points > 0) {
            console.log(`🎉 Successfully found points: ${points}`);
            return points;
          }
        }
      }
      
      console.log('❌ No points found on rewards page');
      console.log('Page content preview:', content.substring(0, 500));
      return null;
      
    } catch (error) {
      console.error(`❌ Error fetching points: ${error.message}`);
      return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Test function
async function test() {
  const solver = new RealisticCaptchaSolver();
  await solver.init();
  
  try {
    console.log('🚀 Starting complete authentication and points fetching flow...');
    
    const loginSuccess = await solver.navigateAndSolve('https://www.freshcope.com/rewards/earn');
    
    if (loginSuccess) {
      console.log('✅ Login flow completed successfully!');
      
      const points = await solver.fetchPoints();
      if (points !== null) {
        console.log(`🎊 FINAL RESULT: Successfully fetched ${points} points!`);
      } else {
        console.log('❌ Login succeeded but could not fetch points');
      }
    } else {
      console.log('❌ Login flow failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('🏁 Test complete. Browser will stay open for inspection...');
    console.log('Press Ctrl+C to close browser...');
    
    // Keep browser open for inspection
    await new Promise(() => {}); // Wait forever until user closes
  }
}

module.exports = { RealisticCaptchaSolver };

if (require.main === module) {
  test().catch(console.error);
}
#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class LoginFirstSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
    
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  async goToLoginPage() {
    console.log('🚪 Going to login page first...');
    
    // Go to login page
    await this.page.goto('https://www.freshcope.com/login', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fill in username and password
    console.log('📝 Filling in login credentials...');
    
    try {
      // Look for common username field selectors
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]', 
        'input[type="email"]',
        'input[id*="username"]',
        'input[id*="email"]',
        'input[placeholder*="username"]',
        'input[placeholder*="email"]'
      ];
      
      let usernameField = null;
      for (const selector of usernameSelectors) {
        try {
          usernameField = await this.page.$(selector);
          if (usernameField) {
            console.log(`✅ Found username field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (usernameField) {
        await usernameField.click();
        await this.page.keyboard.type('your_username_here'); // You'd need to provide real creds
        console.log('✅ Username filled');
      } else {
        console.log('❌ Could not find username field');
      }
      
      // Look for password field
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[id*="password"]',
        'input[placeholder*="password"]'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) {
            console.log(`✅ Found password field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (passwordField) {
        await passwordField.click();
        await this.page.keyboard.type('your_password_here'); // You'd need to provide real creds
        console.log('✅ Password filled');
      } else {
        console.log('❌ Could not find password field');
      }
      
      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Login")',
        'button:contains("Sign In")',
        '[class*="login"]',
        '[class*="submit"]'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await this.page.$(selector);
          if (submitButton) {
            console.log(`✅ Found submit button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (submitButton) {
        console.log('🔄 Clicking submit button...');
        await submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.log('❌ Could not find submit button - trying Enter key');
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (e) {
      console.log(`⚠️ Login attempt error: ${e.message}`);
    }
    
    // Check if we hit a CAPTCHA after login attempt
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🎯 CAPTCHA appeared after login attempt!');
      return true;
    } else {
      console.log('ℹ️ No CAPTCHA found after login - this approach sets up the flow');
      return false;
    }
  }

  async solvePuzzleIfPresent() {
    console.log('🧩 Attempting to solve puzzle with hover activation...');
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) {
      console.log('❌ No iframe found');
      return false;
    }
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) {
      console.log('❌ Could not access iframe');
      return false;
    }
    
    // CRITICAL: Activate hover states first!
    console.log('👆 Activating hover states...');
    
    // Hover over the CAPTCHA image area
    await this.page.mouse.move(iframeBox.x + 150, iframeBox.y + 200, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    if (!slider) {
      console.log('❌ No slider found');
      return false;
    }
    
    const sliderBox = await slider.boundingBox();
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log(`🎯 Slider at: ${startX}, ${startY}`);
    
    // Activate slider hover state
    console.log('👆 Hovering over slider to activate...');
    await this.page.mouse.move(startX, startY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for activation
    
    // Try a reasonable distance with the working movement
    const distance = 120;
    console.log(`🧩 Attempting ${distance}px drag with activated states...`);
    
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Use the working continuous movement
    const startDragX = startX + 5;
    const endDragX = startX + distance;
    const totalSteps = 50;
    const stepDelay = 30;
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = startDragX + (endDragX - startDragX) * progress;
      const currentY = startY + Math.sin(progress * Math.PI) * 2;
      
      await this.page.mouse.move(currentX, currentY);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
      
      if (step % 12 === 0) {
        const distanceMoved = currentX - startX;
        console.log(`📏 Login-first movement: ${Math.round(distanceMoved)}px`);
      }
    }
    
    await this.page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check result
    const content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`🏁 Login-first approach: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async test() {
    console.log('🚀 Testing login-first approach...');
    
    const captchaFound = await this.goToLoginPage();
    
    if (captchaFound) {
      return await this.solvePuzzleIfPresent();
    } else {
      console.log('ℹ️ No CAPTCHA triggered - login flow may need real credentials');
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new LoginFirstSolver();
  await solver.init();
  
  try {
    const result = await solver.test();
    console.log(`\n🏁 FINAL RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
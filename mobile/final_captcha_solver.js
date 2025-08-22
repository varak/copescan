#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class FinalCaptchaSolver {
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

  async solveCaptcha() {
    console.log('🧩 Final CAPTCHA solver - reliable approach...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    if (!slider) return false;
    
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log(`🎯 Slider at: ${startX}, ${startY}`);
    
    // Move to slider
    await this.page.mouse.move(startX, startY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click down
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Do ONE continuous drag from start to end, checking as we go
    console.log('🎯 Starting continuous drag to find puzzle match...');
    
    const startDragX = startX + 5;
    const endDragX = startX + 280;
    const totalSteps = 120; // Many small steps
    const stepDelay = 25;
    
    let solved = false;
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = startDragX + (endDragX - startDragX) * progress;
      const currentY = startY + Math.sin(progress * Math.PI) * 2; // Slight wave
      
      await this.page.mouse.move(currentX, currentY);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
      
      const distanceMoved = currentX - startX;
      
      // Report progress
      if (step % 20 === 0) {
        console.log(`📏 Dragging... ${Math.round(distanceMoved)}px`);
      }
      
      // Check for success only after moving substantial distance
      if (distanceMoved >= 120 && step % 10 === 0) {
        try {
          // Take screenshot every so often to see progress
          if (step % 30 === 0) {
            await this.page.screenshot({ path: `drag_${Math.round(distanceMoved)}.png` });
          }
          
          const content = await this.page.content();
          if (!content.toLowerCase().includes('captcha')) {
            console.log(`✅ PUZZLE SOLVED at ${Math.round(distanceMoved)}px!`);
            solved = true;
            break;
          }
        } catch (e) {
          // Keep moving
        }
      }
    }
    
    // Release and final check
    await this.page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!solved) {
      const content = await this.page.content();
      solved = !content.toLowerCase().includes('captcha');
    }
    
    console.log(`🏁 Final check: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      const solved = await this.solveCaptcha();
      
      if (solved) {
        // Continue with login
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const usernameField = await this.page.$('input[name="username"], input[type="email"]');
        if (usernameField) {
          await usernameField.type('mike@emke.com', { delay: 100 });
        }
        
        const passwordField = await this.page.$('input[type="password"]');
        if (passwordField) {
          await passwordField.type('cope123123A!', { delay: 100 });
        }
        
        const submitButton = await this.page.$('input[type="submit"], button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get points
        await this.page.goto('https://www.freshcope.com/rewards/redeem', {
          waitUntil: 'networkidle2',
          timeout: 15000
        });
        
        const rewardsContent = await this.page.content();
        const match = rewardsContent.match(/(\d+)\s*points?/i);
        if (match && match[1]) {
          const points = parseInt(match[1]);
          if (!isNaN(points) && points > 0) {
            console.log(`🎊 SUCCESS! Found ${points} points!`);
            return points;
          }
        }
      }
    }
    
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new FinalCaptchaSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 FINAL RESULT: ${result || 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { FinalCaptchaSolver };

if (require.main === module) {
  test().catch(console.error);
}
#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class BruteForceSolver {
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

  async solveBruteForce() {
    console.log('💪 BRUTE FORCE: Try every distance until it works!');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    if (!slider) return false;
    
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log(`🎯 Slider at: ${startX}, ${startY}`);
    
    // Try different distances - NO GUESSING, just try them all!
    const distances = [50, 80, 110, 140, 170, 200, 230];
    
    for (const distance of distances) {
      console.log(`\n💪 TRYING ${distance}px - moving for REAL...`);
      
      // Move to slider
      await this.page.mouse.move(startX, startY, { steps: 10 });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Click down
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Move to target with continuous movement (this was working!)
      const targetX = startX + distance;
      const steps = 50;
      
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const currentX = startX + (distance * progress);
        const currentY = startY + Math.sin(progress * Math.PI) * 2;
        
        await this.page.mouse.move(currentX, currentY);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      // Release
      await this.page.mouse.up();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if it worked
      try {
        const content = await this.page.content();
        if (!content.toLowerCase().includes('captcha')) {
          console.log(`🎉 SUCCESS! Distance ${distance}px WORKED!`);
          return true;
        } else {
          console.log(`❌ Distance ${distance}px failed, trying next...`);
        }
      } catch (e) {
        console.log(`❌ Error checking ${distance}px, trying next...`);
      }
      
      // Small delay before next attempt
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('💪 All distances tried - brute force complete');
    return false;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solveBruteForce();
    }
    
    return true;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new BruteForceSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`\n🏁 BRUTE FORCE RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { BruteForceSolver };

if (require.main === module) {
  test().catch(console.error);
}
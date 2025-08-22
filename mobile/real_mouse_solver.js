#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');

puppeteer.use(StealthPlugin());

class RealMouseSolver {
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
        '--disable-dev-shm-usage'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
    
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  async moveRealMouse(x, y) {
    return new Promise((resolve, reject) => {
      // Use xdotool to move the actual system mouse cursor
      exec(`xdotool mousemove ${Math.round(x)} ${Math.round(y)}`, (error) => {
        if (error) {
          console.log(`Mouse move error: ${error.message}`);
        }
        resolve();
      });
    });
  }

  async clickRealMouse() {
    return new Promise((resolve, reject) => {
      exec(`xdotool mousedown 1`, (error) => {
        if (error) {
          console.log(`Mouse down error: ${error.message}`);
        }
        resolve();
      });
    });
  }

  async releaseRealMouse() {
    return new Promise((resolve, reject) => {
      exec(`xdotool mouseup 1`, (error) => {
        if (error) {
          console.log(`Mouse up error: ${error.message}`);
        }
        resolve();
      });
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async solveWithRealMouse() {
    console.log('🖱️ Using REAL SYSTEM MOUSE to solve CAPTCHA...');
    
    await this.sleep(3000);
    
    // Get browser window position
    const windowInfo = await this.page.evaluate(() => {
      return {
        screenX: window.screenX,
        screenY: window.screenY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      };
    });
    
    console.log('🖥️ Browser window info:', windowInfo);
    
    // Find the slider in the iframe
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) {
      console.log('❌ No iframe found');
      return false;
    }
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) {
      console.log('❌ Cannot access iframe');
      return false;
    }
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    if (!slider) {
      console.log('❌ No slider found');
      return false;
    }
    
    const sliderBox = await slider.boundingBox();
    
    // Calculate absolute screen coordinates
    const browserX = windowInfo.screenX;
    const browserY = windowInfo.screenY + (window.outerHeight - window.innerHeight); // Account for title bar
    
    const sliderScreenX = browserX + iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const sliderScreenY = browserY + iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log(`🎯 Slider screen position: ${sliderScreenX}, ${sliderScreenY}`);
    
    // Move your real mouse to the slider
    console.log('👆 Moving YOUR REAL MOUSE to slider...');
    await this.moveRealMouse(sliderScreenX, sliderScreenY);
    await this.sleep(1000);
    
    console.log('🖱️ Clicking down with YOUR REAL MOUSE...');
    await this.clickRealMouse();
    await this.sleep(200);
    
    console.log('🎯 Dragging YOUR REAL MOUSE across the puzzle...');
    
    // Drag across different distances
    const distances = [120, 150, 180, 200, 220, 250];
    
    for (const distance of distances) {
      const targetX = sliderScreenX + distance;
      const targetY = sliderScreenY + (Math.random() - 0.5) * 4;
      
      console.log(`📏 Moving to ${distance}px (${targetX}, ${targetY})...`);
      
      // Move smoothly with multiple steps
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentX = sliderScreenX + (distance * progress);
        const currentY = sliderScreenY + (Math.random() - 0.5) * 2;
        
        await this.moveRealMouse(currentX, currentY);
        await this.sleep(30);
      }
      
      // Check if solved
      await this.sleep(500);
      
      try {
        const content = await this.page.content();
        if (!content.toLowerCase().includes('captcha')) {
          console.log(`✅ CAPTCHA SOLVED at ${distance}px with REAL MOUSE!`);
          await this.releaseRealMouse();
          return true;
        }
      } catch (e) {
        // Continue
      }
    }
    
    console.log('🖱️ Releasing YOUR REAL MOUSE...');
    await this.releaseRealMouse();
    
    await this.sleep(2000);
    
    // Final check
    const content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`🏁 Real mouse result: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🔍 CAPTCHA detected - using real mouse!');
      return await this.solveWithRealMouse();
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
  console.log('🚨 WARNING: This will control your REAL MOUSE CURSOR!');
  console.log('🚨 Make sure the browser window is visible and not minimized!');
  
  const solver = new RealMouseSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 FINAL RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { RealMouseSolver };

if (require.main === module) {
  test().catch(console.error);
}
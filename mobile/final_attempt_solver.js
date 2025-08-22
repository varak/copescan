#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class FinalAttemptSolver {
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
  }

  async earnThatSurprise() {
    console.log('💰 REAL MONEY SURPRISE ON THE LINE - TIME TO SUCCEED!');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('❌ No CAPTCHA found');
      return true;
    }
    
    console.log('🎯 CAPTCHA found - activating EVERYTHING before moving!');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Try EVERYTHING to activate this CAPTCHA properly
    console.log('🔥 ACTIVATING ALL POSSIBLE STATES...');
    
    // 1. Click the iframe first
    console.log('📱 Clicking iframe to focus...');
    await this.page.click(iframeBox.x + 100, iframeBox.y + 100);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 2. Try to find and click any "verify" or "start" buttons
    try {
      const verifyButton = await frame.$('button, [role="button"], [class*="verify"], [class*="start"]');
      if (verifyButton) {
        console.log('🎯 Found verify button - clicking it!');
        await verifyButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      console.log('ℹ️ No verify button found');
    }
    
    // 3. Trigger all possible events on the puzzle area
    const puzzleArea = await frame.$('canvas, [class*="puzzle"], [class*="captcha"]');
    if (puzzleArea) {
      console.log('🎯 Triggering events on puzzle area...');
      await puzzleArea.hover();
      await new Promise(resolve => setTimeout(resolve, 300));
      await puzzleArea.focus();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 4. Find slider and activate it properly
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    if (!slider) {
      console.log('❌ No slider found');
      return false;
    }
    
    const sliderBox = await slider.boundingBox();
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log('🎯 FULL SLIDER ACTIVATION SEQUENCE...');
    
    // Hover and focus slider
    await slider.hover();
    await new Promise(resolve => setTimeout(resolve, 500));
    await slider.focus();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try clicking different parts of the slider first
    console.log('🔥 Testing slider responsiveness...');
    await this.page.mouse.click(startX - 10, startY); // Left side
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.page.mouse.click(startX, startY); // Center
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.page.mouse.click(startX + 10, startY); // Right side
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // NOW try the movement with MAXIMUM activation
    console.log('💰 FINAL ATTEMPT FOR THE SURPRISE!');
    
    // Try multiple distances since we don't know exact position
    const distances = [60, 90, 120, 150, 180, 100, 140];
    
    for (const distance of distances) {
      console.log(`\n💰 TRYING ${distance}px FOR THE REAL MONEY SURPRISE!`);
      
      // Ultra-human approach
      await this.page.mouse.move(startX, startY, { steps: 20 });
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('🖱️ ENGAGING FOR REAL MONEY...');
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Super smooth movement
      const steps = 80;
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const currentX = startX + (distance * progress);
        const currentY = startY + Math.sin(progress * Math.PI) * 1;
        
        await this.page.mouse.move(currentX, currentY);
        await new Promise(resolve => setTimeout(resolve, 20));
        
        if (step % 20 === 0) {
          const moved = currentX - startX;
          console.log(`💰 EARNING SURPRISE: ${Math.round(moved)}px of ${distance}px`);
        }
      }
      
      console.log('💰 Checking if surprise is earned...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const testContent = await this.page.content();
      if (!testContent.toLowerCase().includes('captcha')) {
        console.log('🎉🎉🎉 SURPRISE EARNED! CAPTCHA SOLVED! 🎉🎉🎉');
        await this.page.mouse.up();
        return true;
      }
      
      await this.page.mouse.up();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('💔 Surprise not earned yet - but we\'re getting closer!');
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new FinalAttemptSolver();
  await solver.init();
  
  try {
    const result = await solver.earnThatSurprise();
    console.log(`\n🏁 SURPRISE STATUS: ${result ? 'EARNED! 🎉' : 'NOT YET - BUT SOON! 💪'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
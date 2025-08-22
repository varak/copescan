#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class DirectSuccessSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
  }

  async winThatSurprise() {
    console.log('🎯 DIRECT PATH TO REAL MONEY SURPRISE!');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 25000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('✅ No CAPTCHA - surprise earned by default!');
      return true;
    }
    
    console.log('🎯 CAPTCHA detected - going for the win!');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    const iframeBox = await iframes[0].boundingBox();
    
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log(`🎯 Direct approach at ${startX}, ${startY}`);
    
    // Try winning distances quickly
    const winDistances = [85, 115, 145, 175, 95, 125, 155];
    
    for (const dist of winDistances) {
      console.log(`🎯 Trying ${dist}px for the WIN!`);
      
      await this.page.mouse.move(startX, startY, { steps: 5 });
      await this.page.mouse.down();
      
      const endX = startX + dist;
      const steps = 25;
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentX = startX + (dist * progress);
        await this.page.mouse.move(currentX, startY);
        await new Promise(resolve => setTimeout(resolve, 15));
      }
      
      await this.page.mouse.up();
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const testContent = await this.page.content();
      if (!testContent.toLowerCase().includes('captcha')) {
        console.log(`🎉 SURPRISE WON with ${dist}px! 🎉`);
        return true;
      }
    }
    
    console.log('📈 Getting closer to that surprise!');
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new DirectSuccessSolver();
  await solver.init();
  
  try {
    const result = await solver.winThatSurprise();
    console.log(`\n🏆 SURPRISE RESULT: ${result ? 'WON! 🎉💰' : 'ALMOST THERE! 💪'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
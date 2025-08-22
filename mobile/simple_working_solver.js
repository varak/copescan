#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class SimpleWorkingSolver {
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

  async simpleSliderTest() {
    console.log('🧪 Simple slider test - just try to move it visibly...');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('❌ No CAPTCHA found');
      return false;
    }
    
    console.log('✅ CAPTCHA found, waiting for it to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find iframe
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) {
      console.log('❌ No iframe found');
      return false;
    }
    
    const frame = await iframes[0].contentFrame();
    if (!frame) {
      console.log('❌ Could not access iframe content');
      return false;
    }
    
    // Find slider element
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    if (!slider) {
      console.log('❌ Slider not found');
      return false;
    }
    
    // Get positions
    const iframeBox = await iframes[0].boundingBox();
    const sliderBox = await slider.boundingBox();
    
    const sliderX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const sliderY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log(`🎯 Slider found at: ${sliderX}, ${sliderY}`);
    console.log(`📐 Iframe: ${iframeBox.x}, ${iframeBox.y} (${iframeBox.width}x${iframeBox.height})`);
    console.log(`📐 Slider in iframe: ${sliderBox.x}, ${sliderBox.y} (${sliderBox.width}x${sliderBox.height})`);
    
    // Use color detection to find the right position
    const targetPosition = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 100; // fallback
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log(`🎨 Scanning ${canvas.width}x${canvas.height} canvas for outline...`);
      
      let bestGap = { x: 0, score: 0 };
      
      // Simple gap detection
      for (let x = 20; x < canvas.width - 20; x += 3) {
        let transparentPixels = 0;
        let brightPixels = 0;
        let totalPixels = 0;
        
        for (let y = 20; y < canvas.height - 20; y += 2) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const alpha = data[idx + 3];
          
          totalPixels++;
          
          if (alpha < 100) transparentPixels++;
          if (r > 200 && g > 200 && b > 200) brightPixels++;
        }
        
        const score = (transparentPixels * 2) + brightPixels;
        if (score > bestGap.score) {
          bestGap = { x: x, score: score };
        }
      }
      
      console.log(`🎯 Best gap found at x=${bestGap.x} (score: ${bestGap.score})`);
      return bestGap.x;
    });
    
    let moveDistance = targetPosition - sliderBox.x;
    
    // If gap detection failed, try a reasonable default
    if (Math.abs(moveDistance) < 20 || Math.abs(moveDistance) > 200) {
      moveDistance = 120; // Try a middle distance
      console.log(`🔧 Gap detection gave ${targetPosition}, using fallback distance: ${moveDistance}px`);
    } else {
      console.log(`🖱️ Using calculated distance: ${moveDistance}px to position ${targetPosition}`);
    }
    
    // Move to slider
    await this.page.mouse.move(sliderX, sliderY, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click and hold - wait longer for the slider to "activate"
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 800)); // Longer hold
    
    // Drag to the calculated position
    const targetX = sliderX + moveDistance;
    const steps = 40;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = sliderX + (moveDistance * progress);
      
      await this.page.mouse.move(currentX, sliderY);
      await new Promise(resolve => setTimeout(resolve, 50)); // Slow movement
      
      if (i % 10 === 0) {
        console.log(`📏 Dragged ${Math.round(moveDistance * progress)}px`);
      }
    }
    
    // Release
    await this.page.mouse.up();
    console.log('🖱️ Drag complete');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check result
    const newContent = await this.page.content();
    const solved = !newContent.toLowerCase().includes('captcha');
    
    console.log(`🏁 Simple test result: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new SimpleWorkingSolver();
  await solver.init();
  
  try {
    const result = await solver.simpleSliderTest();
    console.log(`\n🏁 FINAL RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { SimpleWorkingSolver };

if (require.main === module) {
  test().catch(console.error);
}
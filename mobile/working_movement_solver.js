#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class WorkingMovementSolver {
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

  async solvePuzzle() {
    console.log('🧩 Using the WORKING movement approach...');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('❌ No CAPTCHA found');
      return true; // No captcha = success
    }
    
    console.log('✅ CAPTCHA found, waiting for it to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find iframe and slider - like the working version
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
    
    // First try to detect the actual gap position
    let targetDistance = 120; // Default
    
    try {
      const gapPosition = await frame.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        console.log(`🔍 Analyzing ${canvas.width}x${canvas.height} canvas...`);
        
        let bestGap = { x: 0, score: 0 };
        
        // Look for transparency patterns (gaps)
        for (let x = 30; x < canvas.width - 30; x += 2) {
          let gapScore = 0;
          
          for (let y = 30; y < canvas.height - 30; y += 3) {
            const idx = (y * canvas.width + x) * 4;
            const alpha = data[idx + 3];
            
            // Count transparent pixels
            if (alpha < 50) {
              gapScore += 2;
            }
            
            // Look for outline colors
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            if (r > 200 && g > 200 && b > 200 && alpha > 200) {
              gapScore += 1;
            }
          }
          
          if (gapScore > bestGap.score) {
            bestGap = { x: x, score: gapScore };
          }
        }
        
        console.log(`🎯 Best gap at x=${bestGap.x} (score: ${bestGap.score})`);
        return bestGap.score > 50 ? bestGap.x : null;
      });
      
      if (gapPosition && gapPosition > 40) {
        targetDistance = gapPosition - sliderBox.x;
        console.log(`🎯 Detected gap at position ${gapPosition}, distance: ${targetDistance}px`);
      } else {
        console.log(`🔧 Gap detection failed, using fallback distances`);
      }
    } catch (e) {
      console.log(`⚠️ Could not analyze canvas: ${e.message}`);
    }
    
    // Try comprehensive range for the surprise!
    const distances = [120, 80, 160, 100, 140, 90, 110, 130, 150, 170, 70, 85, 95, 105, 115, 125, 135];
    
    for (const distance of distances) {
      console.log(`\n💪 TRYING ${distance}px with WORKING movement...`);
      
      // IMPORTANT: Trigger hover states first!
      console.log('👆 Triggering hover states...');
      
      // Hover over CAPTCHA image first to activate it
      await this.page.mouse.move(iframeBox.x + 100, iframeBox.y + 200, { steps: 10 });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Now hover over slider to activate it  
      console.log('👆 Moving to slider and activating hover...');
      await this.page.mouse.move(startX, startY, { steps: 15 });
      await new Promise(resolve => setTimeout(resolve, 800)); // Wait for hover state
      
      console.log('🖱️ Clicking down...');
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`🧩 Dragging ${distance}px using CONTINUOUS movement...`);
      
      // THIS IS THE WORKING MOVEMENT CODE from advanced_puzzle_solver
      const startDragX = startX + 5;
      const endDragX = startX + distance;
      const totalSteps = 50;
      const stepDelay = 30;
      
      for (let step = 0; step <= totalSteps; step++) {
        const progress = step / totalSteps;
        const currentX = startDragX + (endDragX - startDragX) * progress;
        const currentY = startY + Math.sin(progress * Math.PI) * 2; // Slight wave motion
        
        await this.page.mouse.move(currentX, currentY);
        await new Promise(resolve => setTimeout(resolve, stepDelay));
        
        if (step % 12 === 0) {
          const distanceMoved = currentX - startX;
          console.log(`📏 Moving... ${Math.round(distanceMoved)}px`);
        }
      }
      
      console.log('🖱️ Releasing...');
      await this.page.mouse.up();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if it worked
      try {
        const newContent = await this.page.content();
        if (!newContent.toLowerCase().includes('captcha')) {
          console.log(`🎉 SUCCESS! Distance ${distance}px WORKED!`);
          return true;
        } else {
          console.log(`❌ Distance ${distance}px failed, trying next...`);
        }
      } catch (e) {
        console.log(`❌ Error checking ${distance}px, trying next...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('💪 All distances tried');
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new WorkingMovementSolver();
  await solver.init();
  
  try {
    const result = await solver.solvePuzzle();
    console.log(`\n🏁 FINAL RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { WorkingMovementSolver };

if (require.main === module) {
  test().catch(console.error);
}
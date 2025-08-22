#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PatternMatchingSolver {
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

  async matchPuzzlePattern() {
    console.log('🧩 PATTERN MATCHING: Finding where puzzle piece fits (like OCR)...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const matchPosition = await frame.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      console.log(`🔍 Found ${canvases.length} canvases`);
      
      if (canvases.length === 0) {
        console.log('❌ No canvases found!');
        return null;
      }
      
      // Try with just one canvas first (might be combined)
      const canvas = canvases[0];
      console.log(`🎯 Using canvas: ${canvas.width}x${canvas.height}`);
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log('🎨 Enhancing image contrast for better pattern detection...');
      
      // Enhance contrast and intensity
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        
        // Increase contrast
        const contrast = 1.5;
        const brightness = 20;
        
        data[i] = Math.min(255, Math.max(0, contrast * (r - 128) + 128 + brightness));
        data[i + 1] = Math.min(255, Math.max(0, contrast * (g - 128) + 128 + brightness));
        data[i + 2] = Math.min(255, Math.max(0, contrast * (b - 128) + 128 + brightness));
      }
      
      // Put enhanced data back
      ctx.putImageData(imageData, 0, 0);
      
      console.log('🔍 Scanning enhanced image for gap patterns...');
      
      let bestGap = { x: 0, score: 0 };
      
      // Scan for gaps
      for (let x = 20; x < canvas.width - 20; x += 5) {
        let transparentPixels = 0;
        let totalPixels = 0;
        let edgeScore = 0;
        
        for (let y = 20; y < canvas.height - 20; y += 3) {
          const idx = (y * canvas.width + x) * 4;
          const alpha = data[idx + 3];
          
          totalPixels++;
          
          if (alpha < 100) {
            transparentPixels++;
          }
          
          // Look for edges
          if (x > 3 && x < canvas.width - 3) {
            const leftIdx = (y * canvas.width + (x - 3)) * 4;
            const rightIdx = (y * canvas.width + (x + 3)) * 4;
            const leftAlpha = data[leftIdx + 3];
            const rightAlpha = data[rightIdx + 3];
            
            if (alpha < 100 && (leftAlpha > 150 || rightAlpha > 150)) {
              edgeScore++;
            }
          }
        }
        
        const transparencyRatio = transparentPixels / totalPixels;
        const score = (transparencyRatio * 100) + edgeScore;
        
        if (score > bestGap.score) {
          bestGap = { x: x, score: score, transparent: transparentPixels, total: totalPixels };
        }
        
        if (x % 50 === 0) {
          console.log(`🔍 x=${x}: transparency=${transparencyRatio.toFixed(2)}, score=${score.toFixed(1)}`);
        }
      }
      
      console.log(`🎯 BEST GAP: x=${bestGap.x}, score=${bestGap.score.toFixed(1)}, ${bestGap.transparent}/${bestGap.total} transparent`);
      return bestGap.score > 5 ? bestGap.x : null;
    });
    
    return matchPosition;
  }

  async solvePuzzleWithPatternMatching() {
    console.log('🧩 Solving puzzle using PATTERN MATCHING (like OCR)...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Find where the pattern matches
    const matchPosition = await this.matchPuzzlePattern();
    if (matchPosition === null) {
      console.log('❌ Could not find pattern match');
      return false;
    }
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    // Calculate movement distance
    const moveDistance = matchPosition - sliderBox.x;
    console.log(`🧩 PATTERN MATCH: Move slider ${moveDistance}px to position ${matchPosition}px`);
    
    // Execute movement
    console.log('👆 Moving to slider...');
    await this.page.mouse.move(startX, startY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🖱️ Clicking down...');
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`🧩 Dragging to pattern match position (${moveDistance}px)...`);
    
    // Smooth continuous movement
    const startDragX = startX + 5;
    const endDragX = startX + moveDistance;
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
        console.log(`📏 Pattern matching drag... ${Math.round(distanceMoved)}px`);
      }
    }
    
    console.log('🖱️ Releasing mouse...');
    await this.page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check result
    const content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`🏁 Pattern matching result: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzleWithPatternMatching();
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
  const solver = new PatternMatchingSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 PATTERN MATCHING FINAL: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { PatternMatchingSolver };

if (require.main === module) {
  test().catch(console.error);
}
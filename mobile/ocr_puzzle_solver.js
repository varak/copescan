#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class OCRPuzzleSolver {
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

  // "OCR" for puzzle gaps - read the image and find where the gap is
  async readGapPosition() {
    console.log('🔍 Reading puzzle image to find gap position (like OCR)...');
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return null;
    
    const frame = await iframes[0].contentFrame();
    if (!frame) return null;
    
    // "Read" the puzzle image like OCR reads text
    const gapPosition = await frame.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length < 1) return null;
      
      const puzzleCanvas = canvases[0];
      const ctx = puzzleCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, puzzleCanvas.width, puzzleCanvas.height);
      const data = imageData.data;
      
      console.log(`Analyzing puzzle image: ${puzzleCanvas.width}x${puzzleCanvas.height}`);
      
      // Scan horizontally like OCR scans for characters
      // Look for the "gap signature" - area with distinct edges
      let bestGapPosition = 0;
      let bestGapScore = 0;
      
      // Scan every 5 pixels horizontally 
      for (let x = 30; x < puzzleCanvas.width - 80; x += 5) {
        let gapScore = 0;
        let edgeCount = 0;
        
        // Check a vertical strip at this X position (like OCR checks character columns)
        for (let y = 20; y < puzzleCanvas.height - 20; y += 3) {
          const idx = (y * puzzleCanvas.width + x) * 4;
          
          // Get current pixel
          const r = data[idx];
          const g = data[idx + 1]; 
          const b = data[idx + 2];
          const alpha = data[idx + 3];
          
          // Check pixels to the left and right
          if (x > 5 && x < puzzleCanvas.width - 5) {
            const leftIdx = (y * puzzleCanvas.width + (x - 5)) * 4;
            const rightIdx = (y * puzzleCanvas.width + (x + 5)) * 4;
            
            const leftR = data[leftIdx];
            const rightR = data[rightIdx];
            
            // Look for edge patterns (sudden color changes)
            const colorDiff = Math.abs(leftR - rightR) + Math.abs(data[leftIdx + 1] - data[rightIdx + 1]);
            
            if (colorDiff > 30) {
              edgeCount++;
            }
            
            // Look for transparency changes (gap characteristic)
            if (alpha < 200) {
              gapScore += 2;
            }
          }
        }
        
        // Combine edge detection and transparency analysis
        const totalScore = edgeCount + gapScore;
        
        if (totalScore > bestGapScore) {
          bestGapScore = totalScore;
          bestGapPosition = x;
        }
      }
      
      console.log(`Gap "OCR" result: position ${bestGapPosition}px (confidence: ${bestGapScore})`);
      return bestGapPosition;
    });
    
    return gapPosition;
  }

  async solvePuzzleWithOCR() {
    console.log('🧩 Solving puzzle using OCR approach...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // "Read" where the gap is (like OCR reads text)
    const gapPosition = await this.readGapPosition();
    if (gapPosition === null) {
      console.log('❌ Could not read gap position');
      return false;
    }
    
    console.log(`📖 OCR found gap at: ${gapPosition}px`);
    
    // Find slider
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const iframeBox = await iframes[0].boundingBox();
    const sliderStartX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const sliderStartY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    // Calculate exact distance to move (like OCR calculates exact character positions)
    const moveDistance = gapPosition - sliderBox.x;
    
    console.log(`🎯 OCR calculation: Move slider ${moveDistance}px to reach gap`);
    
    // Execute movement using the working continuous approach
    await this.page.mouse.move(sliderStartX, sliderStartY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use VERY visible movement - make sure it actually moves!
    console.log(`🎯 Starting VISIBLE drag to OCR target (${moveDistance}px)...`);
    
    const targetX = sliderStartX + moveDistance;
    
    // Move in bigger, more visible chunks
    const steps = 10; // Fewer steps, bigger movements
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = sliderStartX + (moveDistance * progress);
      const currentY = sliderStartY + (Math.random() - 0.5) * 4; // Random Y variation
      
      console.log(`👀 VISIBLE MOVE ${i}: ${Math.round(currentX - sliderStartX)}px`);
      await this.page.mouse.move(currentX, currentY, { steps: 1 }); // Force immediate movement
      await new Promise(resolve => setTimeout(resolve, 200)); // Longer delay to see it move
    }
    
    await this.page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check result
    const content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`🏁 OCR puzzle solving: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzleWithOCR();
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
  const solver = new OCRPuzzleSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 OCR APPROACH RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { OCRPuzzleSolver };

if (require.main === module) {
  test().catch(console.error);
}
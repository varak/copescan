#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class ColorOutlineSolver {
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

  async findColorOutline() {
    console.log('🎨 Looking for different colored puzzle piece outline...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const gapPosition = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log(`🎨 Scanning for colored outline in ${canvas.width}x${canvas.height} image...`);
      
      // Look for the puzzle piece outline - it's usually a specific color like white/yellow
      let colorCandidates = [];
      
      // Scan horizontally for the outline color pattern
      for (let x = 40; x < canvas.width - 40; x += 3) { // Skip edges, focus on middle area
        let outlineScore = 0;
        let whitePixels = 0;
        let brightPixels = 0;
        
        // Check this vertical column for outline characteristics
        for (let y = 20; y < canvas.height - 20; y += 2) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const alpha = data[idx + 3];
          
          // Skip transparent areas
          if (alpha < 150) continue;
          
          // Look specifically for white/light colored outline (common in puzzles)
          const isWhitish = r > 220 && g > 220 && b > 220;
          const isYellowish = r > 200 && g > 200 && b < 150;
          const isBright = (r + g + b) > 600;
          
          if (isWhitish) whitePixels++;
          if (isYellowish) brightPixels++;
          if (isBright) brightPixels++;
          
          // Look for the characteristic puzzle piece "notch" pattern
          if (y > 5 && y < canvas.height - 5) {
            // Check vertical color changes (notch creates distinct patterns)
            const aboveIdx = ((y - 3) * canvas.width + x) * 4;
            const belowIdx = ((y + 3) * canvas.width + x) * 4;
            
            const aboveBright = (data[aboveIdx] + data[aboveIdx + 1] + data[aboveIdx + 2]) > 600;
            const belowBright = (data[belowIdx] + data[belowIdx + 1] + data[belowIdx + 2]) > 600;
            const currentBright = (r + g + b) > 600;
            
            // Look for brightness transitions (edge of puzzle piece)
            if ((currentBright && !aboveBright) || (currentBright && !belowBright)) {
              outlineScore += 2;
            }
          }
          
          // Check if this pixel is very different from neighbors (edge detection)
          if (x > 2 && x < canvas.width - 2) {
            const leftIdx = (y * canvas.width + (x - 2)) * 4;
            const rightIdx = (y * canvas.width + (x + 2)) * 4;
            
            const colorDiff = Math.abs(r - data[leftIdx]) + 
                            Math.abs(g - data[leftIdx + 1]) + 
                            Math.abs(b - data[leftIdx + 2]) +
                            Math.abs(r - data[rightIdx]) + 
                            Math.abs(g - data[rightIdx + 1]) + 
                            Math.abs(b - data[rightIdx + 2]);
            
            if (colorDiff > 100) {
              outlineScore++;
            }
          }
        }
        
        // Combine white pixels, bright pixels, and outline score
        const totalScore = (whitePixels * 3) + (brightPixels * 2) + outlineScore;
        colorCandidates.push({ x: x, score: totalScore, white: whitePixels, bright: brightPixels, edges: outlineScore });
      }
      
      // Find the best candidate
      const bestCandidate = colorCandidates.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      console.log(`🎨 COLOR OUTLINE found at x=${bestCandidate.x} (score: ${bestCandidate.score}, white: ${bestCandidate.white}, bright: ${bestCandidate.bright}, edges: ${bestCandidate.edges})`);
      
      // Show top candidates
      const topCandidates = colorCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      console.log('🎨 Top color outline candidates:');
      topCandidates.forEach((candidate, i) => {
        console.log(`  ${i+1}. x=${candidate.x} score=${candidate.score} (white:${candidate.white}, bright:${candidate.bright}, edges:${candidate.edges})`);
      });
      
      return bestCandidate.x;
    });
    
    return gapPosition;
  }

  async solvePuzzleWithColorOutline() {
    console.log('🧩 Solving puzzle using COLOR OUTLINE detection...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Find the colored outline position
    const outlinePosition = await this.findColorOutline();
    if (!outlinePosition) {
      console.log('❌ Could not find colored outline');
      return false;
    }
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    // Also try frame-relative coordinates
    const frameStartX = sliderBox.x + sliderBox.width / 2;
    const frameStartY = sliderBox.y + sliderBox.height / 2;
    
    // Calculate movement distance
    const moveDistance = outlinePosition - sliderBox.x;
    console.log(`🎨 COLOR OUTLINE: Move slider ${moveDistance}px to reach outline at ${outlinePosition}px`);
    
    // Try DOM-based interaction to simulate real user
    console.log('🎯 Using DOM events to simulate real user interaction...');
    
    await frame.evaluate((sliderX, sliderY, targetDistance) => {
      const slider = document.querySelector('[class*="slider"]:not([class*="track"])');
      if (!slider) return;
      
      console.log('🖱️ Dispatching mousedown event...');
      
      // Create and dispatch mousedown
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: sliderX,
        clientY: sliderY,
        button: 0
      });
      slider.dispatchEvent(mouseDownEvent);
      
      // Simulate dragging with multiple mousemove events
      console.log('📏 Simulating drag movement...');
      
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentX = sliderX + (targetDistance * progress);
        
        const mouseMoveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: currentX,
          clientY: sliderY,
          button: 0
        });
        
        document.dispatchEvent(mouseMoveEvent);
        slider.dispatchEvent(mouseMoveEvent);
      }
      
      // Final mouseup
      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: sliderX + targetDistance,
        clientY: sliderY,
        button: 0
      });
      
      document.dispatchEvent(mouseUpEvent);
      slider.dispatchEvent(mouseUpEvent);
      
      console.log('🖱️ DOM drag simulation complete');
      
    }, frameStartX, frameStartY, moveDistance);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try small adjustments if not solved yet
    let content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🔧 Making fine adjustments...');
      
      // Try small movements left and right
      const adjustments = [-15, -10, -5, 5, 10, 15, 20];
      
      for (const adj of adjustments) {
        console.log(`🔧 Trying adjustment ${adj}px...`);
        
        await frame.evaluate((sliderX, sliderY, targetDistance) => {
          const slider = document.querySelector('[class*="slider"]:not([class*="track"])');
          if (!slider) return;
          
          // Quick adjustment drag
          const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, clientX: sliderX, clientY: sliderY, button: 0 });
          slider.dispatchEvent(mouseDownEvent);
          
          const mouseMoveEvent = new MouseEvent('mousemove', { bubbles: true, clientX: sliderX + targetDistance, clientY: sliderY, button: 0 });
          document.dispatchEvent(mouseMoveEvent);
          
          const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true, clientX: sliderX + targetDistance, clientY: sliderY, button: 0 });
          document.dispatchEvent(mouseUpEvent);
        }, frameStartX, frameStartY, moveDistance + adj);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        content = await this.page.content();
        if (!content.toLowerCase().includes('captcha')) {
          console.log(`🎉 SUCCESS with adjustment ${adj}px!`);
          return true;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check final result
    content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`🏁 Color outline solving: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzleWithColorOutline();
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
  const solver = new ColorOutlineSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 COLOR OUTLINE RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { ColorOutlineSolver };

if (require.main === module) {
  test().catch(console.error);
}
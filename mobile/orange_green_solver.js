#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class OrangeGreenSolver {
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

  async findOrangeGreenOutline() {
    console.log('🟠🟢 Looking for ORANGE and GREEN puzzle piece outlines...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const gapPosition = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log(`🟠🟢 Scanning for ORANGE/GREEN outlines in ${canvas.width}x${canvas.height} canvas...`);
      
      let colorCandidates = [];
      
      for (let x = 30; x < canvas.width - 30; x += 3) {
        let orangePixels = 0;
        let greenPixels = 0;
        let outlineScore = 0;
        
        for (let y = 20; y < canvas.height - 20; y += 2) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const alpha = data[idx + 3];
          
          if (alpha < 150) continue;
          
          // Look for ORANGE colors (high red, medium green, low blue)
          const isOrange = r > 200 && g > 100 && g < 200 && b < 100;
          
          // Look for GREEN colors (low red, high green, low blue)  
          const isGreen = r < 150 && g > 150 && b < 150;
          
          // Look for any bright outline colors
          const isBrightOutline = (r > 180 && g > 100) || (g > 180 && r > 100);
          
          if (isOrange) {
            orangePixels++;
            outlineScore += 3;
          }
          
          if (isGreen) {
            greenPixels++;
            outlineScore += 3;
          }
          
          if (isBrightOutline) {
            outlineScore += 1;
          }
          
          // Edge detection for puzzle piece boundaries
          if (x > 2 && x < canvas.width - 2) {
            const leftIdx = (y * canvas.width + (x - 2)) * 4;
            const rightIdx = (y * canvas.width + (x + 2)) * 4;
            
            const colorDiff = Math.abs(r - data[leftIdx]) + 
                            Math.abs(g - data[leftIdx + 1]) + 
                            Math.abs(b - data[leftIdx + 2]);
            
            if (colorDiff > 80) {
              outlineScore += 1;
            }
          }
        }
        
        const totalScore = (orangePixels * 4) + (greenPixels * 4) + outlineScore;
        colorCandidates.push({ 
          x: x, 
          score: totalScore, 
          orange: orangePixels, 
          green: greenPixels, 
          outline: outlineScore 
        });
      }
      
      const bestCandidate = colorCandidates.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      console.log(`🟠🟢 BEST ORANGE/GREEN outline at x=${bestCandidate.x} (score: ${bestCandidate.score}, orange: ${bestCandidate.orange}, green: ${bestCandidate.green})`);
      
      // Show top candidates
      const topCandidates = colorCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      
      console.log('🟠🟢 Top outline candidates:');
      topCandidates.forEach((candidate, i) => {
        console.log(`  ${i+1}. x=${candidate.x} (orange:${candidate.orange}, green:${candidate.green}, total:${candidate.score})`);
      });
      
      return bestCandidate.score > 20 ? bestCandidate.x : null;
    });
    
    return gapPosition;
  }

  async solvePuzzle() {
    console.log('🟠🟢 Solving puzzle with ORANGE/GREEN detection...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Try to find orange/green outline
    let targetPosition = await this.findOrangeGreenOutline();
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    // If detection worked, use it; otherwise try some distances
    let distances;
    if (targetPosition && targetPosition > 50) {
      const detectedDistance = targetPosition - sliderBox.x;
      console.log(`🟠🟢 Using detected position: ${detectedDistance}px`);
      distances = [detectedDistance, detectedDistance - 10, detectedDistance + 10];
    } else {
      console.log('🟠🟢 Using fallback distances');
      distances = [80, 120, 160, 100, 140, 90, 110, 130];
    }
    
    for (const distance of distances) {
      console.log(`\n🟠🟢 TRYING ${distance}px...`);
      
      // Simple approach like the original brute force
      await this.page.mouse.move(startX, startY, { steps: 10 });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Continuous movement like what was working
      const steps = 50;
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const currentX = startX + (distance * progress);
        const currentY = startY + Math.sin(progress * Math.PI) * 2;
        
        await this.page.mouse.move(currentX, currentY);
        await new Promise(resolve => setTimeout(resolve, 20));
        
        if (step % 12 === 0) {
          const moved = currentX - startX;
          console.log(`🟠🟢 Moving... ${Math.round(moved)}px`);
        }
      }
      
      await this.page.mouse.up();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const content = await this.page.content();
      if (!content.toLowerCase().includes('captcha')) {
        console.log(`🎉 SUCCESS with ${distance}px! Orange/Green detection worked!`);
        return true;
      }
      
      console.log(`❌ ${distance}px failed, trying next...`);
    }
    
    return false;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzle();
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
  const solver = new OrangeGreenSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 ORANGE/GREEN RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PreciseHesitationSolver {
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

  async findPreciseGapPosition() {
    console.log('🔍 Using WORKING color outline detection...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const gapPosition = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log(`🎨 Scanning for colored outline in ${canvas.width}x${canvas.height} image...`);
      
      let colorCandidates = [];
      
      // Use the WORKING color detection approach
      for (let x = 40; x < canvas.width - 40; x += 3) {
        let outlineScore = 0;
        let whitePixels = 0;
        let brightPixels = 0;
        
        for (let y = 20; y < canvas.height - 20; y += 2) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const alpha = data[idx + 3];
          
          if (alpha < 150) continue;
          
          const isWhitish = r > 220 && g > 220 && b > 220;
          const isYellowish = r > 200 && g > 200 && b < 150;
          const isBright = (r + g + b) > 600;
          
          if (isWhitish) whitePixels++;
          if (isYellowish) brightPixels++;
          if (isBright) brightPixels++;
          
          if (y > 5 && y < canvas.height - 5) {
            const aboveIdx = ((y - 3) * canvas.width + x) * 4;
            const belowIdx = ((y + 3) * canvas.width + x) * 4;
            
            const aboveBright = (data[aboveIdx] + data[aboveIdx + 1] + data[aboveIdx + 2]) > 600;
            const belowBright = (data[belowIdx] + data[belowIdx + 1] + data[belowIdx + 2]) > 600;
            const currentBright = (r + g + b) > 600;
            
            if ((currentBright && !aboveBright) || (currentBright && !belowBright)) {
              outlineScore += 2;
            }
          }
        }
        
        const totalScore = (whitePixels * 3) + (brightPixels * 2) + outlineScore;
        colorCandidates.push({ x: x, score: totalScore, white: whitePixels, bright: brightPixels, edges: outlineScore });
      }
      
      const bestCandidate = colorCandidates.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      console.log(`🎨 COLOR OUTLINE found at x=${bestCandidate.x} (score: ${bestCandidate.score})`);
      
      return {
        position: bestCandidate.x,
        confidence: bestCandidate.score,
        details: bestCandidate
      };
    });
    
    return gapPosition;
  }

  async solvePuzzleWithPrecision() {
    console.log('🧩 Solving puzzle with PRECISION and HESITATION...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // STEP 1: Analyze the gap PRECISELY before moving
    const gapAnalysis = await this.findPreciseGapPosition();
    if (!gapAnalysis || gapAnalysis.confidence < 50) {
      console.log('❌ Gap analysis failed or low confidence');
      return false;
    }
    
    // STEP 2: Find slider and calculate exact distance needed
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    const targetDistance = gapAnalysis.position - sliderBox.x;
    
    console.log(`🎯 PRECISE PLAN: Move ${targetDistance}px to gap at x=${gapAnalysis.position}`);
    console.log(`📊 Confidence: ${gapAnalysis.confidence.toFixed(1)}`);
    
    // STEP 3: Human-like approach with hesitation
    console.log('👆 Approaching slider like a human...');
    await this.page.mouse.move(startX, startY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 800)); // Human pause
    
    console.log('🖱️ Engaging slider...');
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 300)); // Hold moment
    
    console.log('🤔 Human hesitation before moving...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Think pause
    
    // STEP 4: Move with human-like hesitation but DON'T let go
    console.log(`🎯 Moving precisely ${targetDistance}px with hesitation...`);
    
    const endX = startX + targetDistance;
    const totalSteps = 60;
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      let currentX = startX + (targetDistance * progress);
      
      // Add human hesitation at 25%, 50%, 75%
      if (step === Math.floor(totalSteps * 0.25) || 
          step === Math.floor(totalSteps * 0.5) || 
          step === Math.floor(totalSteps * 0.75)) {
        console.log(`🤔 Human hesitation at ${Math.round(progress * 100)}%...`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Hesitation pause
      }
      
      // Slight human tremor
      const currentY = startY + Math.sin(progress * Math.PI * 2) * 1;
      
      await this.page.mouse.move(currentX, currentY);
      await new Promise(resolve => setTimeout(resolve, 40)); // Slower human speed
      
      if (step % 15 === 0) {
        const distanceMoved = currentX - startX;
        console.log(`📏 Precise movement: ${Math.round(distanceMoved)}px (target: ${targetDistance}px)`);
      }
    }
    
    console.log('🎯 Reached target position - checking if correct...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Human verification pause
    
    // Check if we're close enough before releasing
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('🎉 SUCCESS! Puzzle solved - releasing now');
      await this.page.mouse.up();
      return true;
    }
    
    console.log('🔧 Not quite right - making micro-adjustments...');
    
    // Micro-adjustments while still holding
    const adjustments = [-5, 5, -10, 10, -3, 3];
    for (const adj of adjustments) {
      console.log(`🔧 Micro-adjustment: ${adj}px`);
      const adjX = endX + adj;
      await this.page.mouse.move(adjX, startY);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const testContent = await this.page.content();
      if (!testContent.toLowerCase().includes('captcha')) {
        console.log(`🎉 SUCCESS with ${adj}px adjustment!`);
        await this.page.mouse.up();
        return true;
      }
    }
    
    console.log('🖱️ Releasing after trying adjustments...');
    await this.page.mouse.up();
    
    return false;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzleWithPrecision();
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
  const solver = new PreciseHesitationSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 PRECISE HESITATION RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
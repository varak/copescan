#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class HumanApproachSolver {
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

  async lookAtImageWithEdgeDetection() {
    console.log('👁️ STEP 1: Looking at image with edge detection filter...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const puzzleAnalysis = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log('👁️ HUMAN VISION: Applying edge detection filter...');
      
      // Create edge detection filter like human vision
      let edgeData = new Uint8ClampedArray(data.length);
      
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          // Get surrounding pixels
          const center = data[idx] + data[idx + 1] + data[idx + 2];
          const left = data[idx - 4] + data[idx - 3] + data[idx - 2];
          const right = data[idx + 4] + data[idx + 5] + data[idx + 6];
          const up = data[idx - canvas.width * 4] + data[idx - canvas.width * 4 + 1] + data[idx - canvas.width * 4 + 2];
          const down = data[idx + canvas.width * 4] + data[idx + canvas.width * 4 + 1] + data[idx + canvas.width * 4 + 2];
          
          // Edge detection (Sobel-like)
          const edgeStrength = Math.abs(center - left) + Math.abs(center - right) + 
                              Math.abs(center - up) + Math.abs(center - down);
          
          const edgeValue = Math.min(255, edgeStrength / 4);
          edgeData[idx] = edgeValue;
          edgeData[idx + 1] = edgeValue;
          edgeData[idx + 2] = edgeValue;
          edgeData[idx + 3] = data[idx + 3]; // Keep alpha
        }
      }
      
      console.log('👁️ HUMAN VISION: Enhanced edge detection applied');
      
      // Now analyze the enhanced image to find puzzle piece
      let puzzlePiecePositions = [];
      
      for (let x = 20; x < canvas.width - 20; x += 2) {
        let edgeScore = 0;
        let gapScore = 0;
        
        for (let y = 20; y < canvas.height - 20; y += 2) {
          const idx = (y * canvas.width + x) * 4;
          const originalAlpha = data[idx + 3];
          const edgeIntensity = edgeData[idx];
          
          // Strong edges indicate puzzle piece boundary
          if (edgeIntensity > 100) {
            edgeScore += edgeIntensity;
          }
          
          // Transparency indicates gap
          if (originalAlpha < 50) {
            gapScore += 10;
          }
          
          // Look for the characteristic puzzle piece shape
          if (originalAlpha > 200 && edgeIntensity > 80) {
            edgeScore += 20; // Strong edge with solid content = puzzle piece edge
          }
        }
        
        const totalScore = edgeScore + (gapScore * 2);
        puzzlePiecePositions.push({ x: x, score: totalScore, edges: edgeScore, gap: gapScore });
      }
      
      // Find the best position
      const bestPosition = puzzlePiecePositions.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      // Show top candidates like human would see
      const topPositions = puzzlePiecePositions
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      
      console.log('👁️ HUMAN VISION: Puzzle piece analysis:');
      topPositions.forEach((pos, i) => {
        console.log(`  ${i+1}. x=${pos.x} (edges:${pos.edges}, gap:${pos.gap}, total:${pos.score})`);
      });
      
      console.log(`👁️ HUMAN PLAN: Puzzle piece should go at x=${bestPosition.x}`);
      
      return {
        targetPosition: bestPosition.x,
        confidence: bestPosition.score,
        analysis: bestPosition
      };
    });
    
    return puzzleAnalysis;
  }

  async humanMouseSequence(targetDistance) {
    console.log('👁️ STEP 2: Human mouseover sequence...');
    
    const iframes = await this.page.$$('iframe');
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    
    // Find slider
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const sliderX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const sliderY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    console.log('👁️ HUMAN: First mouseover edge of CAPTCHA...');
    // Mouseover edge of CAPTCHA first (like human would)
    await this.page.mouse.move(iframeBox.x + 50, iframeBox.y + 100, { steps: 8 });
    await new Promise(resolve => setTimeout(resolve, 400)); // Human pause
    
    console.log('👁️ HUMAN: Now mouseover the sliding pointer...');
    // Then mouseover the slider (activates it)
    await this.page.mouse.move(sliderX, sliderY, { steps: 12 });
    await new Promise(resolve => setTimeout(resolve, 600)); // Human evaluation pause
    
    console.log('🖱️ HUMAN: Click and hold (never let go)...');
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 200)); // Human grip moment
    
    console.log(`👁️ HUMAN: Slowly sliding ${targetDistance}px to precise position...`);
    
    // Human-like slow slide to exact position
    const startX = sliderX;
    const endX = sliderX + targetDistance;
    const totalSteps = Math.max(30, Math.abs(targetDistance)); // More steps for precision
    
    for (let step = 0; step <= totalSteps; step++) {
      const progress = step / totalSteps;
      const currentX = startX + (targetDistance * progress);
      
      // Very slight human tremor
      const tremor = Math.sin(step * 0.3) * 0.5;
      const currentY = sliderY + tremor;
      
      await this.page.mouse.move(currentX, currentY);
      await new Promise(resolve => setTimeout(resolve, 25)); // Slow human speed
      
      if (step % 10 === 0) {
        const moved = currentX - startX;
        console.log(`👁️ HUMAN SLIDING: ${Math.round(moved)}px of ${targetDistance}px`);
      }
    }
    
    console.log('👁️ HUMAN: Reached target - checking if it fits...');
    await new Promise(resolve => setTimeout(resolve, 300)); // Human verification
    
    // Check if solved while still holding
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('🎉 PERFECT! Puzzle solved - releasing grip');
      await this.page.mouse.up();
      return true;
    }
    
    console.log('👁️ HUMAN: Making tiny adjustments while holding...');
    
    // Human micro-adjustments while still gripping
    const microAdjustments = [-2, 2, -4, 4, -1, 1, -3, 3];
    
    for (const adj of microAdjustments) {
      const adjX = endX + adj;
      await this.page.mouse.move(adjX, sliderY);
      await new Promise(resolve => setTimeout(resolve, 150)); // Human adjustment time
      
      const testContent = await this.page.content();
      if (!testContent.toLowerCase().includes('captcha')) {
        console.log(`🎉 SUCCESS with ${adj}px micro-adjustment!`);
        await this.page.mouse.up();
        return true;
      }
    }
    
    console.log('🖱️ HUMAN: Releasing after trying adjustments...');
    await this.page.mouse.up();
    return false;
  }

  async solveWithHumanApproach() {
    console.log('🧠 Solving puzzle exactly like a human would...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // STEP 1: Look at image with edge detection
    const analysis = await this.lookAtImageWithEdgeDetection();
    if (!analysis || analysis.confidence < 100) {
      console.log('👁️ HUMAN: Cannot see puzzle piece clearly enough');
      return false;
    }
    
    // STEP 2: Calculate how far to move
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const targetDistance = analysis.targetPosition - sliderBox.x;
    
    console.log(`🧠 HUMAN PLAN: Puzzle piece at x=${analysis.targetPosition}`);
    console.log(`🧠 HUMAN PLAN: Need to slide ${targetDistance}px`);
    console.log(`🧠 HUMAN PLAN: Confidence ${analysis.confidence}`);
    
    // STEP 3: Execute human mouse sequence
    return await this.humanMouseSequence(targetDistance);
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solveWithHumanApproach();
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
  const solver = new HumanApproachSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 HUMAN APPROACH RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
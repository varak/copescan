#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PhotoshopFilterSolver {
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

  async analyzeWithPhotoshopFilters() {
    console.log('🎨 PHOTOSHOP-STYLE FILTERS: Threshold and Edge Detection...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const gapPosition = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log(`🎨 PHOTOSHOP FILTERS: Analyzing ${canvas.width}x${canvas.height} canvas...`);
      
      // FILTER 1: THRESHOLD (Black/White slider effect)
      console.log('🎨 THRESHOLD FILTER: Converting to black/white...');
      let thresholdData = new Uint8ClampedArray(data.length);
      
      // Try different threshold values like moving the slider
      const thresholdLevels = [128, 100, 150, 80, 180];
      let bestThreshold = null;
      let maxContrast = 0;
      
      for (const threshold of thresholdLevels) {
        let contrast = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];
          
          // Convert to grayscale
          const gray = (r + g + b) / 3;
          
          // Apply threshold (like Photoshop slider)
          const bw = gray > threshold ? 255 : 0;
          
          thresholdData[i] = bw;
          thresholdData[i + 1] = bw;
          thresholdData[i + 2] = bw;
          thresholdData[i + 3] = alpha;
          
          // Measure contrast for this threshold
          if (i > 0) {
            const prevBw = thresholdData[i - 4];
            contrast += Math.abs(bw - prevBw);
          }
        }
        
        if (contrast > maxContrast) {
          maxContrast = contrast;
          bestThreshold = threshold;
        }
      }
      
      console.log(`🎨 BEST THRESHOLD: ${bestThreshold} (contrast: ${maxContrast})`);
      
      // FILTER 2: EDGE DETECTION (like Photoshop Find Edges)
      console.log('🎨 EDGE DETECTION: Finding outlines...');
      let edgeData = new Uint8ClampedArray(data.length);
      
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          // Sobel edge detection (like Photoshop)
          const tl = data[(y-1) * canvas.width * 4 + (x-1) * 4];
          const tm = data[(y-1) * canvas.width * 4 + x * 4];
          const tr = data[(y-1) * canvas.width * 4 + (x+1) * 4];
          const ml = data[y * canvas.width * 4 + (x-1) * 4];
          const mm = data[y * canvas.width * 4 + x * 4];
          const mr = data[y * canvas.width * 4 + (x+1) * 4];
          const bl = data[(y+1) * canvas.width * 4 + (x-1) * 4];
          const bm = data[(y+1) * canvas.width * 4 + x * 4];
          const br = data[(y+1) * canvas.width * 4 + (x+1) * 4];
          
          // Sobel X and Y gradients
          const sobelX = (tr + 2*mr + br) - (tl + 2*ml + bl);
          const sobelY = (bl + 2*bm + br) - (tl + 2*tm + tr);
          const edgeStrength = Math.sqrt(sobelX*sobelX + sobelY*sobelY);
          
          const edgeValue = Math.min(255, edgeStrength);
          edgeData[idx] = edgeValue;
          edgeData[idx + 1] = edgeValue;
          edgeData[idx + 2] = edgeValue;
          edgeData[idx + 3] = data[idx + 3];
        }
      }
      
      // ANALYSIS: Find puzzle piece gap using filtered data
      console.log('🎨 ANALYZING FILTERED IMAGES for puzzle piece...');
      
      let gapCandidates = [];
      
      for (let x = 20; x < canvas.width - 20; x += 2) {
        let gapScore = 0;
        let edgeScore = 0;
        let thresholdScore = 0;
        
        for (let y = 20; y < canvas.height - 20; y += 2) {
          const idx = (y * canvas.width + x) * 4;
          
          // Score from edge detection
          const edgeIntensity = edgeData[idx];
          if (edgeIntensity > 100) {
            edgeScore += edgeIntensity;
          }
          
          // Score from threshold filter
          const thresholdValue = thresholdData[idx];
          if (thresholdValue === 0) { // Black areas (gaps)
            thresholdScore += 10;
          }
          
          // Look for transparency (actual gaps)
          const alpha = data[idx + 3];
          if (alpha < 50) {
            gapScore += 15;
          }
        }
        
        const totalScore = gapScore + (edgeScore / 100) + (thresholdScore / 5);
        gapCandidates.push({ 
          x: x, 
          score: totalScore, 
          gap: gapScore, 
          edge: Math.round(edgeScore / 100), 
          threshold: Math.round(thresholdScore / 5) 
        });
      }
      
      const bestCandidate = gapCandidates.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      console.log(`🎨 PHOTOSHOP ANALYSIS: Best gap at x=${bestCandidate.x} (total: ${bestCandidate.score.toFixed(1)}, gap: ${bestCandidate.gap}, edge: ${bestCandidate.edge}, threshold: ${bestCandidate.threshold})`);
      
      // Show top candidates
      const topCandidates = gapCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      
      console.log('🎨 PHOTOSHOP FILTER RESULTS:');
      topCandidates.forEach((candidate, i) => {
        console.log(`  ${i+1}. x=${candidate.x} (score: ${candidate.score.toFixed(1)})`);
      });
      
      return bestCandidate.score > 20 ? bestCandidate.x : null;
    });
    
    return gapPosition;
  }

  async solvePuzzle() {
    console.log('🎨 Solving puzzle with PHOTOSHOP-STYLE FILTERS...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Use Photoshop-style analysis
    const targetPosition = await this.analyzeWithPhotoshopFilters();
    
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    let distances;
    if (targetPosition && targetPosition > 30) {
      const detectedDistance = targetPosition - sliderBox.x;
      console.log(`🎨 PHOTOSHOP DETECTED: ${detectedDistance}px`);
      distances = [detectedDistance];
    } else {
      console.log('🎨 PHOTOSHOP FALLBACK: Using test distances');
      distances = [90, 120, 150, 80, 110, 140];
    }
    
    for (const distance of distances) {
      console.log(`\n🎨 PHOTOSHOP ATTEMPT: ${distance}px...`);
      
      await this.page.mouse.move(startX, startY, { steps: 10 });
      await new Promise(resolve => setTimeout(resolve, 400));
      
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Same movement that was working before
      const steps = 50;
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const currentX = startX + (distance * progress);
        const currentY = startY + Math.sin(progress * Math.PI) * 2;
        
        await this.page.mouse.move(currentX, currentY);
        await new Promise(resolve => setTimeout(resolve, 25));
        
        if (step % 12 === 0) {
          const moved = currentX - startX;
          console.log(`🎨 Photoshop moving... ${Math.round(moved)}px`);
        }
      }
      
      await this.page.mouse.up();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const content = await this.page.content();
      if (!content.toLowerCase().includes('captcha')) {
        console.log(`🎉 PHOTOSHOP SUCCESS with ${distance}px!`);
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
  const solver = new PhotoshopFilterSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 PHOTOSHOP FILTER RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
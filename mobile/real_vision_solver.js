#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class RealVisionSolver {
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
    
    this.page = await browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
  }

  // This is what REAL vision should look like
  async analyzeActualPuzzleImage() {
    console.log('👁️ REAL VISION: Actually looking at the puzzle image...');
    
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    
    const analysis = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      console.log(`👁️ VISION: Scanning ${canvas.width}x${canvas.height} image pixel by pixel...`);
      
      // REAL VISION: Look for the actual gap pattern
      let gapColumns = [];
      
      // Scan each column of pixels
      for (let x = 0; x < canvas.width; x++) {
        let transparentPixels = 0;
        let edgePixels = 0;
        let totalPixels = 0;
        
        // Look down this column
        for (let y = 0; y < canvas.height; y++) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const alpha = data[idx + 3];
          
          totalPixels++;
          
          // Count transparent/missing pixels (the gap!)
          if (alpha < 128) {
            transparentPixels++;
          }
          
          // Count edge pixels (boundaries of the gap)
          if (y > 0 && y < canvas.height - 1) {
            const aboveIdx = ((y-1) * canvas.width + x) * 4;
            const belowIdx = ((y+1) * canvas.width + x) * 4;
            
            const colorDiffAbove = Math.abs(r - data[aboveIdx]) + Math.abs(g - data[aboveIdx + 1]) + Math.abs(b - data[aboveIdx + 2]);
            const colorDiffBelow = Math.abs(r - data[belowIdx]) + Math.abs(g - data[belowIdx + 1]) + Math.abs(b - data[belowIdx + 2]);
            
            if (colorDiffAbove > 50 || colorDiffBelow > 50) {
              edgePixels++;
            }
          }
        }
        
        // Calculate gap "signature" for this column
        const transparencyRatio = transparentPixels / totalPixels;
        const edgeRatio = edgePixels / totalPixels;
        const gapScore = (transparencyRatio * 100) + (edgeRatio * 50);
        
        gapColumns.push({ x: x, score: gapScore, transparent: transparentPixels, edges: edgePixels });
      }
      
      // Find the column with the highest gap score
      const bestGap = gapColumns.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      console.log(`👁️ VISION RESULT: Gap found at x=${bestGap.x} (score: ${bestGap.score.toFixed(1)}, transparent: ${bestGap.transparent}, edges: ${bestGap.edges})`);
      
      // Show top 5 candidates for debugging
      const topCandidates = gapColumns
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      console.log('👁️ VISION: Top gap candidates:');
      topCandidates.forEach((candidate, i) => {
        console.log(`  ${i+1}. x=${candidate.x} score=${candidate.score.toFixed(1)}`);
      });
      
      return bestGap.x;
    });
    
    return analysis;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// This shows the difference between GUESSING and VISION
console.log(`
🧠 GUESSING (what I was doing wrong):
   - "Gap is probably at 50% across" 
   - gap = width * 0.5
   - No actual image analysis!

👁️ REAL VISION (what I should do):
   - Look at every pixel column
   - Find transparency patterns
   - Find edge patterns  
   - Return EXACT coordinates
`);

module.exports = { RealVisionSolver };
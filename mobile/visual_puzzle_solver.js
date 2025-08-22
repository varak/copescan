#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class VisualPuzzleSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false,
      devtools: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
    
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  async analyzePuzzleVisually() {
    console.log('🔍 Taking detailed puzzle screenshot for analysis...');
    await this.page.screenshot({ path: 'puzzle_before_analysis.png', fullPage: true });
    
    // Get iframe
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return null;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return null;
    
    // Analyze the puzzle components
    const puzzleAnalysis = await frame.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const images = document.querySelectorAll('img');
      
      let analysis = {
        canvases: [],
        images: [],
        puzzleWidth: 0,
        gapPosition: null
      };
      
      // Get canvas information
      canvases.forEach((canvas, i) => {
        const rect = canvas.getBoundingClientRect();
        analysis.canvases.push({
          index: i,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          className: canvas.className
        });
      });
      
      // Get image information  
      images.forEach((img, i) => {
        const rect = img.getBoundingClientRect();
        analysis.images.push({
          index: i,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          src: img.src.substring(0, 50) + '...'
        });
      });
      
      // Find the main puzzle canvas (usually the largest one)
      if (analysis.canvases.length > 0) {
        const mainCanvas = analysis.canvases.reduce((largest, canvas) => 
          canvas.width > largest.width ? canvas : largest
        );
        
        analysis.puzzleWidth = mainCanvas.width;
        
            // Try to find the actual gap by looking for visual differences
        // Get canvas data to analyze the actual puzzle image
        try {
          const canvasEl = canvases[mainCanvas.index];
          const ctx = canvasEl.getContext('2d');
          const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
          const data = imageData.data;
          
          // Look for the gap by scanning for areas with different pixel patterns
          let possibleGaps = [];
          const scanWidth = 20; // Scan in 20px chunks
          
          for (let x = 0; x < canvasEl.width - scanWidth; x += 10) {
            let edgeCount = 0;
            
            // Count edges in this vertical strip
            for (let y = 0; y < canvasEl.height - 1; y++) {
              const currentPixel = (y * canvasEl.width + x) * 4;
              const nextPixel = ((y + 1) * canvasEl.width + x) * 4;
              
              // Simple edge detection - look for color differences
              const currentGray = data[currentPixel] * 0.3 + data[currentPixel + 1] * 0.59 + data[currentPixel + 2] * 0.11;
              const nextGray = data[nextPixel] * 0.3 + data[nextPixel + 1] * 0.59 + data[nextPixel + 2] * 0.11;
              
              if (Math.abs(currentGray - nextGray) > 30) { // Edge threshold
                edgeCount++;
              }
            }
            
            possibleGaps.push({ x: x, edgeCount: edgeCount });
          }
          
          // Find the area with the most edges (likely the gap)
          const gapArea = possibleGaps.reduce((max, current) => 
            current.edgeCount > max.edgeCount ? current : max
          );
          
          analysis.gapPosition = mainCanvas.x + gapArea.x;
          console.log(`Gap detected at x=${gapArea.x} (${gapArea.edgeCount} edges), absolute position: ${analysis.gapPosition}`);
          
        } catch (e) {
          // Fallback to estimation
          const gapRatio = 0.7; // Most gaps are around 70% across
          analysis.gapPosition = mainCanvas.x + (mainCanvas.width * gapRatio);
          console.log(`Canvas analysis failed, using estimate: ${analysis.gapPosition}`);
        }
      }
      
      return analysis;
    });
    
    console.log('🧩 Puzzle analysis result:', JSON.stringify(puzzleAnalysis, null, 2));
    return { puzzleAnalysis, iframeBox, frame };
  }

  async solvePuzzleVisually() {
    console.log('🧩 Starting visual puzzle analysis and solving...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const analysis = await this.analyzePuzzleVisually();
    if (!analysis) {
      console.log('❌ Could not analyze puzzle');
      return false;
    }
    
    const { puzzleAnalysis, iframeBox, frame } = analysis;
    
    // Find slider
    const sliderSelectors = ['[class*="slider"]:not([class*="track"])', '.slider-handle'];
    let slider = null;
    let sliderBox = null;
    
    for (const selector of sliderSelectors) {
      const elements = await frame.$$(selector);
      for (const element of elements) {
        const box = await element.boundingBox();
        if (box && box.width > 10 && box.width < 100) {
          slider = element;
          sliderBox = box;
          console.log(`✅ Found slider: ${selector} (${box.width}x${box.height})`);
          break;
        }
      }
      if (slider) break;
    }
    
    if (!slider || !sliderBox) {
      console.log('❌ No slider found');
      return false;
    }
    
    // Calculate where to move the slider
    const sliderStartX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const sliderStartY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    let targetDistance = 200; // Default
    
    if (puzzleAnalysis.gapPosition) {
      // Convert gap position to slider movement distance
      targetDistance = puzzleAnalysis.gapPosition - sliderBox.x;
      console.log(`🎯 Calculated target distance: ${targetDistance}px based on gap at ${puzzleAnalysis.gapPosition}px`);
    }
    
    // Clamp target distance to reasonable bounds
    targetDistance = Math.max(150, Math.min(300, targetDistance));
    
    console.log(`🎯 Final target: Move slider ${targetDistance}px to the right`);
    
    // Execute the movement
    console.log('👆 Moving to slider...');
    await this.page.mouse.move(sliderStartX, sliderStartY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('🖱️ Clicking down...');
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`🎯 Dragging to target position (${targetDistance}px)...`);
    const targetX = sliderStartX + targetDistance;
    const targetY = sliderStartY + (Math.random() - 0.5) * 4; // Slight Y variation
    
    // Move in one smooth motion with many steps
    await this.page.mouse.move(targetX, targetY, { steps: 80 });
    
    console.log('🖱️ Releasing mouse...');
    await this.page.mouse.up();
    
    // Wait and take final screenshot
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.page.screenshot({ path: 'puzzle_after_attempt.png', fullPage: true });
    
    // Check if solved by looking for page changes
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('✅ CAPTCHA appears to be solved!');
      return true;
    }
    
    console.log(`📏 Moved puzzle piece ${targetDistance}px - checking result...`);
    return false;
  }

  async navigateAndSolve() {
    console.log('🌐 Navigating to FreshCope...');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🔍 CAPTCHA detected!');
      return await this.solvePuzzleVisually();
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
  const solver = new VisualPuzzleSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 Result: ${result ? 'SUCCESS' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { VisualPuzzleSolver };

if (require.main === module) {
  test().catch(console.error);
}
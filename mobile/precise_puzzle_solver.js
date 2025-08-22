#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PrecisePuzzleSolver {
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

  async findExactGapPosition() {
    console.log('🔍 Analyzing puzzle to find EXACT gap position...');
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return null;
    
    const frame = await iframes[0].contentFrame();
    if (!frame) return null;
    
    // Extract the actual puzzle images for analysis
    const puzzleData = await frame.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      
      if (canvases.length < 2) return null;
      
      // Get the main puzzle image (background with gap)
      const puzzleCanvas = canvases[0];
      const puzzleCtx = puzzleCanvas.getContext('2d');
      const puzzleImageData = puzzleCtx.getImageData(0, 0, puzzleCanvas.width, puzzleCanvas.height);
      
      // Get the piece canvas (the moving piece)
      const pieceCanvas = canvases[1];
      const pieceCtx = pieceCanvas.getContext('2d');
      const pieceImageData = pieceCtx.getImageData(0, 0, pieceCanvas.width, pieceCanvas.height);
      
      // Convert image data to base64 for analysis
      const puzzleDataURL = puzzleCanvas.toDataURL();
      const pieceDataURL = pieceCanvas.toDataURL();
      
      return {
        puzzleWidth: puzzleCanvas.width,
        puzzleHeight: puzzleCanvas.height,
        pieceWidth: pieceCanvas.width,
        pieceHeight: pieceCanvas.height,
        puzzleImage: puzzleDataURL,
        pieceImage: pieceDataURL,
        canvasRect: puzzleCanvas.getBoundingClientRect()
      };
    });
    
    if (!puzzleData) {
      console.log('❌ Could not extract puzzle data');
      return null;
    }
    
    console.log(`📐 Puzzle: ${puzzleData.puzzleWidth}x${puzzleData.puzzleHeight}`);
    console.log(`🧩 Piece: ${puzzleData.pieceWidth}x${puzzleData.pieceHeight}`);
    
    // Now do template matching in the browser to find exact gap position
    const gapPosition = await frame.evaluate((data) => {
      // Create temporary canvases for analysis
      const tempPuzzle = document.createElement('canvas');
      const tempPiece = document.createElement('canvas');
      
      tempPuzzle.width = data.puzzleWidth;
      tempPuzzle.height = data.puzzleHeight;
      tempPiece.width = data.pieceWidth;
      tempPiece.height = data.pieceHeight;
      
      const puzzleCtx = tempPuzzle.getContext('2d');
      const pieceCtx = tempPiece.getContext('2d');
      
      // Load the images
      const puzzleImg = new Image();
      const pieceImg = new Image();
      
      return new Promise((resolve) => {
        let loaded = 0;
        
        function checkLoaded() {
          loaded++;
          if (loaded === 2) {
            // Both images loaded, now find the gap
            puzzleCtx.drawImage(puzzleImg, 0, 0);
            pieceCtx.drawImage(pieceImg, 0, 0);
            
            const puzzleImageData = puzzleCtx.getImageData(0, 0, data.puzzleWidth, data.puzzleHeight);
            const pieceImageData = pieceCtx.getImageData(0, 0, data.pieceWidth, data.pieceHeight);
            
            // Find the puzzle piece outline in the piece canvas
            let pieceLeft = data.pieceWidth, pieceRight = 0, pieceTop = data.pieceHeight, pieceBottom = 0;
            
            for (let y = 0; y < data.pieceHeight; y++) {
              for (let x = 0; x < data.pieceWidth; x++) {
                const idx = (y * data.pieceWidth + x) * 4;
                const alpha = pieceImageData.data[idx + 3];
                
                if (alpha > 100) { // Non-transparent pixel
                  pieceLeft = Math.min(pieceLeft, x);
                  pieceRight = Math.max(pieceRight, x);
                  pieceTop = Math.min(pieceTop, y);
                  pieceBottom = Math.max(pieceBottom, y);
                }
              }
            }
            
            const pieceActualWidth = pieceRight - pieceLeft;
            console.log(`Piece bounds: ${pieceLeft}-${pieceRight} (width: ${pieceActualWidth}px)`);
            
            // Look for the gap by finding areas of color discontinuity
            let bestMatch = { x: 0, score: Infinity };
            
            // Scan horizontally for the gap - look for edge patterns
            for (let x = 20; x < data.puzzleWidth - 60; x += 2) {
              let edgeScore = 0;
              let totalSamples = 0;
              
              // Check vertical strips for edge density (gaps have lots of edges)
              for (let y = 20; y < data.puzzleHeight - 20; y += 3) {
                if (x > 0 && x < data.puzzleWidth - 1) {
                  const leftIdx = (y * data.puzzleWidth + (x - 1)) * 4;
                  const centerIdx = (y * data.puzzleWidth + x) * 4;
                  const rightIdx = (y * data.puzzleWidth + (x + 1)) * 4;
                  
                  // Get RGB values
                  const leftR = puzzleImageData.data[leftIdx];
                  const leftG = puzzleImageData.data[leftIdx + 1];
                  const leftB = puzzleImageData.data[leftIdx + 2];
                  
                  const centerR = puzzleImageData.data[centerIdx];
                  const centerG = puzzleImageData.data[centerIdx + 1];
                  const centerB = puzzleImageData.data[centerIdx + 2];
                  
                  const rightR = puzzleImageData.data[rightIdx];
                  const rightG = puzzleImageData.data[rightIdx + 1];
                  const rightB = puzzleImageData.data[rightIdx + 2];
                  
                  // Calculate color differences (edge detection)
                  const leftDiff = Math.abs(centerR - leftR) + Math.abs(centerG - leftG) + Math.abs(centerB - leftB);
                  const rightDiff = Math.abs(centerR - rightR) + Math.abs(centerG - rightG) + Math.abs(centerB - rightB);
                  
                  // High edge activity suggests a gap boundary
                  edgeScore += leftDiff + rightDiff;
                  totalSamples++;
                }
              }
              
              if (totalSamples > 0) {
                const avgEdgeScore = edgeScore / totalSamples;
                
                // Also check for the characteristic gap shape - look for missing content
                let gapScore = 0;
                for (let dy = 10; dy < 40; dy += 5) {
                  for (let dx = 0; dx < 40; dx += 5) {
                    const checkX = x + dx;
                    const checkY = Math.floor(data.puzzleHeight / 2) + dy - 20;
                    
                    if (checkX < data.puzzleWidth && checkY < data.puzzleHeight && checkY > 0) {
                      const idx = (checkY * data.puzzleWidth + checkX) * 4;
                      const alpha = puzzleImageData.data[idx + 3];
                      
                      // Look for areas with low alpha (the gap)
                      if (alpha < 100) {
                        gapScore += 1;
                      }
                    }
                  }
                }
                
                // Combine edge activity and gap detection
                const combinedScore = avgEdgeScore + (gapScore * 50);
                
                if (combinedScore > bestMatch.score) {
                  bestMatch = { x: x, score: combinedScore };
                }
              }
            }
            
            console.log(`Best gap match at x=${bestMatch.x} (score: ${bestMatch.score})`);
            resolve(bestMatch.x);
          }
        }
        
        puzzleImg.onload = checkLoaded;
        pieceImg.onload = checkLoaded;
        
        puzzleImg.src = data.puzzleImage;
        pieceImg.src = data.pieceImage;
      });
    }, puzzleData);
    
    console.log(`🎯 EXACT gap position found: ${gapPosition}px`);
    return { gapPosition, canvasRect: puzzleData.canvasRect };
  }

  async solvePuzzlePrecisely() {
    console.log('🧩 Starting PRECISE puzzle solving...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const gapData = await this.findExactGapPosition();
    if (!gapData) {
      console.log('❌ Could not find gap position');
      return false;
    }
    
    const { gapPosition, canvasRect } = gapData;
    
    // Find slider
    const iframes = await this.page.$$('iframe');
    const frame = await iframes[0].contentFrame();
    const slider = await frame.$('[class*="slider"]:not([class*="track"])');
    const sliderBox = await slider.boundingBox();
    
    // Calculate precise movement
    const iframeBox = await iframes[0].boundingBox();
    const sliderStartX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
    const sliderStartY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
    
    // The target is where the gap is, relative to the slider starting position
    const targetDistance = gapPosition - sliderBox.x;
    
    console.log(`🎯 PRECISE calculation: Gap at ${gapPosition}px, slider at ${sliderBox.x}px`);
    console.log(`🎯 Moving slider EXACTLY ${targetDistance}px to the right`);
    
    // Execute precise movement
    await this.page.mouse.move(sliderStartX, sliderStartY, { steps: 15 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await this.page.mouse.down();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const targetX = sliderStartX + targetDistance;
    await this.page.mouse.move(targetX, sliderStartY, { steps: 60 });
    
    await this.page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check result
    const content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`📏 Moved ${targetDistance}px - ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzlePrecisely();
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
  const solver = new PrecisePuzzleSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 FINAL RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { PrecisePuzzleSolver };

if (require.main === module) {
  test().catch(console.error);
}
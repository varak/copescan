#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class DOMPuzzleSolver {
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

  async solvePuzzleWithDOM() {
    console.log('🧩 Using DOM events to solve puzzle...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Use DOM manipulation directly in the iframe
    const result = await frame.evaluate(() => {
      console.log('🔍 Analyzing puzzle in DOM...');
      
      // Find the slider element
      const slider = document.querySelector('[class*="slider"]:not([class*="track"])');
      if (!slider) {
        console.log('❌ No slider found');
        return false;
      }
      
      const sliderRect = slider.getBoundingClientRect();
      console.log(`✅ Found slider at ${sliderRect.x}, ${sliderRect.y} (${sliderRect.width}x${sliderRect.height})`);
      
      // Analyze the puzzle image
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length < 1) {
        console.log('❌ No canvas found');
        return false;
      }
      
      const puzzleCanvas = canvases[0];
      const ctx = puzzleCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, puzzleCanvas.width, puzzleCanvas.height);
      const data = imageData.data;
      
      console.log(`📊 Analyzing ${puzzleCanvas.width}x${puzzleCanvas.height} puzzle image...`);
      
      // Find gap using OCR approach
      let bestGap = 0;
      let bestScore = 0;
      
      for (let x = 20; x < puzzleCanvas.width - 60; x += 3) {
        let edgeCount = 0;
        let transparencyCount = 0;
        
        for (let y = 20; y < puzzleCanvas.height - 20; y += 5) {
          const idx = (y * puzzleCanvas.width + x) * 4;
          const alpha = data[idx + 3];
          
          if (alpha < 150) transparencyCount++;
          
          if (x > 2 && x < puzzleCanvas.width - 2) {
            const leftIdx = (y * puzzleCanvas.width + (x - 2)) * 4;
            const rightIdx = (y * puzzleCanvas.width + (x + 2)) * 4;
            
            const colorDiff = Math.abs(data[leftIdx] - data[rightIdx]) + 
                            Math.abs(data[leftIdx + 1] - data[rightIdx + 1]) + 
                            Math.abs(data[leftIdx + 2] - data[rightIdx + 2]);
            
            if (colorDiff > 40) edgeCount++;
          }
        }
        
        const score = edgeCount + (transparencyCount * 2);
        if (score > bestScore) {
          bestScore = score;
          bestGap = x;
        }
      }
      
      console.log(`🎯 DOM OCR found gap at ${bestGap}px (score: ${bestScore})`);
      
      // Calculate movement distance
      const moveDistance = bestGap - sliderRect.x;
      console.log(`📐 Need to move slider ${moveDistance}px`);
      
      // Create and dispatch real mouse events
      const startX = sliderRect.x + sliderRect.width / 2;
      const startY = sliderRect.y + sliderRect.height / 2;
      const endX = startX + moveDistance;
      
      console.log(`🖱️ DOM: Starting drag from ${startX} to ${endX}`);
      
      // Dispatch mousedown
      const mouseDown = new MouseEvent('mousedown', {
        clientX: startX,
        clientY: startY,
        bubbles: true,
        cancelable: true,
        button: 0
      });
      slider.dispatchEvent(mouseDown);
      console.log('✅ DOM: mousedown dispatched');
      
      // Dispatch mousemove events
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const currentX = startX + (moveDistance * i / steps);
        const currentY = startY + (Math.random() - 0.5) * 2;
        
        const mouseMove = new MouseEvent('mousemove', {
          clientX: currentX,
          clientY: currentY,
          bubbles: true,
          cancelable: true,
          button: 0
        });
        slider.dispatchEvent(mouseMove);
        
        if (i % 5 === 0) {
          console.log(`🔄 DOM: mousemove ${i} - position ${Math.round(currentX - startX)}px`);
        }
      }
      
      // Dispatch mouseup
      const mouseUp = new MouseEvent('mouseup', {
        clientX: endX,
        clientY: startY,
        bubbles: true,
        cancelable: true,
        button: 0
      });
      slider.dispatchEvent(mouseUp);
      console.log('✅ DOM: mouseup dispatched');
      
      return true;
    });
    
    if (!result) {
      console.log('❌ DOM manipulation failed');
      return false;
    }
    
    // Wait and check result
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const content = await this.page.content();
    const solved = !content.toLowerCase().includes('captcha');
    
    console.log(`🏁 DOM approach result: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async navigateAndSolve() {
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      return await this.solvePuzzleWithDOM();
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
  const solver = new DOMPuzzleSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 DOM APPROACH FINAL: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { DOMPuzzleSolver };

if (require.main === module) {
  test().catch(console.error);
}
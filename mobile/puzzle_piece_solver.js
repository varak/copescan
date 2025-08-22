#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PuzzlePieceSolver {
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
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
  }

  async solvePuzzle() {
    console.log('🧩 Trying to interact directly with puzzle piece...');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    const content = await this.page.content();
    if (!content.toLowerCase().includes('captcha')) {
      console.log('❌ No CAPTCHA found');
      return true;
    }
    
    console.log('✅ CAPTCHA found, waiting...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Find iframe
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    console.log('🎯 Looking for puzzle piece canvas...');
    
    // Try to find the puzzle piece directly
    const canvases = await frame.$$('canvas');
    console.log(`Found ${canvases.length} canvases`);
    
    if (canvases.length >= 2) {
      // Try clicking on the second canvas (usually the moving piece)
      const pieceCanvas = canvases[1];
      const pieceBox = await pieceCanvas.boundingBox();
      
      const pieceX = iframeBox.x + pieceBox.x + pieceBox.width / 2;
      const pieceY = iframeBox.y + pieceBox.y + pieceBox.height / 2;
      
      console.log(`🧩 Puzzle piece at: ${pieceX}, ${pieceY}`);
      console.log(`📐 Piece canvas: ${pieceBox.width}x${pieceBox.height}`);
      
      // Try dragging the piece directly
      console.log('🖱️ Clicking on puzzle piece...');
      await this.page.mouse.move(pieceX, pieceY, { steps: 10 });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try dragging right
      const targetX = pieceX + 120;
      console.log(`🧩 Dragging piece from ${pieceX} to ${targetX}...`);
      
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentX = pieceX + (120 * progress);
        
        await this.page.mouse.move(currentX, pieceY);
        await new Promise(resolve => setTimeout(resolve, 30));
        
        if (i % 15 === 0) {
          console.log(`📏 Piece dragging... ${Math.round(120 * progress)}px`);
        }
      }
      
      await this.page.mouse.up();
      console.log('🖱️ Released puzzle piece');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newContent = await this.page.content();
      const solved = !newContent.toLowerCase().includes('captcha');
      
      console.log(`🏁 Puzzle piece approach: ${solved ? 'SUCCESS!' : 'FAILED'}`);
      return solved;
    }
    
    // Fallback: try clicking in different areas
    console.log('🎯 Trying different click positions...');
    
    const testPositions = [
      { x: iframeBox.x + 100, y: iframeBox.y + 200, name: "Left area" },
      { x: iframeBox.x + 150, y: iframeBox.y + 200, name: "Center area" },
      { x: iframeBox.x + 200, y: iframeBox.y + 200, name: "Right area" },
    ];
    
    for (const pos of testPositions) {
      console.log(`🔍 Testing ${pos.name} at ${pos.x}, ${pos.y}...`);
      
      await this.page.mouse.move(pos.x, pos.y, { steps: 5 });
      await this.page.mouse.down();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try dragging
      await this.page.mouse.move(pos.x + 100, pos.y, { steps: 20 });
      await this.page.mouse.up();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const testContent = await this.page.content();
      if (!testContent.toLowerCase().includes('captcha')) {
        console.log(`🎉 SUCCESS with ${pos.name}!`);
        return true;
      }
    }
    
    return false;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new PuzzlePieceSolver();
  await solver.init();
  
  try {
    const result = await solver.solvePuzzle();
    console.log(`\n🏁 FINAL RESULT: ${result ? 'SUCCESS!' : 'FAILED'}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

if (require.main === module) {
  test().catch(console.error);
}
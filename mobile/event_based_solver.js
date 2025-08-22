#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class EventBasedSolver {
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

  async solvePuzzle() {
    console.log('🎯 Trying REAL browser events approach...');
    
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
    
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) return false;
    
    const iframeBox = await iframes[0].boundingBox();
    const frame = await iframes[0].contentFrame();
    if (!frame) return false;
    
    // Try to simulate REAL events by injecting JavaScript that acts like a human
    const result = await frame.evaluate((iframeX, iframeY) => {
      console.log('🎯 Starting REAL event simulation...');
      
      // Find the slider
      const slider = document.querySelector('[class*="slider"]:not([class*="track"])');
      if (!slider) {
        console.log('❌ No slider found');
        return false;
      }
      
      const sliderRect = slider.getBoundingClientRect();
      const startX = sliderRect.left + sliderRect.width / 2;
      const startY = sliderRect.top + sliderRect.height / 2;
      
      console.log(`🎯 Slider at: ${startX}, ${startY}`);
      
      // Try different distances
      const distances = [80, 120, 160, 100, 140];
      
      for (const distance of distances) {
        console.log(`🎯 Trying ${distance}px with REAL events...`);
        
        try {
          // Create proper event sequence like a real browser would
          const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: startX,
            screenY: startY,
            clientX: startX,
            clientY: startY,
            button: 0,
            buttons: 1,
            relatedTarget: null
          });
          
          // Dispatch mousedown on slider
          slider.dispatchEvent(mouseDownEvent);
          console.log('✅ Mousedown dispatched');
          
          // Wait a moment
          setTimeout(() => {
            
            // Create mousemove events - simulate dragging
            const steps = 40;
            let currentStep = 0;
            
            const moveInterval = setInterval(() => {
              const progress = currentStep / steps;
              const currentX = startX + (distance * progress);
              
              const mouseMoveEvent = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                view: window,
                detail: 1,
                screenX: currentX,
                screenY: startY,
                clientX: currentX,
                clientY: startY,
                button: 0,
                buttons: 1,
                relatedTarget: null
              });
              
              // Dispatch on both document and slider
              document.dispatchEvent(mouseMoveEvent);
              slider.dispatchEvent(mouseMoveEvent);
              
              if (currentStep % 10 === 0) {
                console.log(`📏 Event-based movement: ${Math.round(distance * progress)}px`);
              }
              
              currentStep++;
              
              if (currentStep > steps) {
                clearInterval(moveInterval);
                
                // Final mouseup
                const mouseUpEvent = new MouseEvent('mouseup', {
                  bubbles: true,
                  cancelable: true,
                  view: window,
                  detail: 1,
                  screenX: currentX,
                  screenY: startY,
                  clientX: currentX,
                  clientY: startY,
                  button: 0,
                  buttons: 0,
                  relatedTarget: null
                });
                
                document.dispatchEvent(mouseUpEvent);
                slider.dispatchEvent(mouseUpEvent);
                console.log('✅ Mouseup dispatched');
              }
            }, 25);
            
          }, 200);
          
        } catch (e) {
          console.log(`❌ Error with ${distance}px: ${e.message}`);
        }
        
        // Wait for this attempt to complete (can't use await in browser context)
        // Will handle timing with intervals instead
        
        // Check if solved
        const captchaStillPresent = document.body.innerHTML.toLowerCase().includes('captcha');
        if (!captchaStillPresent) {
          console.log(`🎉 SUCCESS with ${distance}px!`);
          return true;
        }
      }
      
      return false;
      
    }, iframeBox.x, iframeBox.y);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalContent = await this.page.content();
    const solved = !finalContent.toLowerCase().includes('captcha');
    
    console.log(`🏁 Event-based approach: ${solved ? 'SUCCESS!' : 'FAILED'}`);
    return solved;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function test() {
  const solver = new EventBasedSolver();
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
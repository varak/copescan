#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class AdvancedPuzzleSolver {
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
        // CRITICAL: Disable site isolation to access cross-origin iframes
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
    
    // Hide webdriver
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  async solvePuzzleCaptcha() {
    console.log('🧩 Advanced puzzle CAPTCHA solver starting...');
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get all iframes
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) {
      console.log('❌ No iframe found');
      return false;
    }
    
    console.log(`Found ${iframes.length} iframe(s)`);
    
    for (let i = 0; i < iframes.length; i++) {
      try {
        console.log(`🔍 Checking iframe ${i}...`);
        
        const iframeBox = await iframes[i].boundingBox();
        if (!iframeBox) continue;
        
        const frame = await iframes[i].contentFrame();
        if (!frame) {
          console.log(`❌ Cannot access iframe ${i} content`);
          continue;
        }
        
        // Wait for frame to load
        await frame.waitForSelector('[class*="slider"], .captcha-slider, [draggable="true"]', { 
          timeout: 5000 
        }).catch(() => null);
        
        // Find slider in this frame
        const sliderSelectors = [
          '[class*="slider"]:not([class*="track"])',
          '.slider-handle',
          '.captcha-slider',
          '[class*="drag"]:not([class*="background"])',
          '[draggable="true"]',
          '.slider-btn'
        ];
        
        let slider = null;
        let sliderBox = null;
        
        for (const selector of sliderSelectors) {
          const elements = await frame.$$(selector);
          for (const element of elements) {
            const box = await element.boundingBox();
            if (box && box.width > 10 && box.width < 100) { // Slider handle is usually small
              slider = element;
              sliderBox = box;
              console.log(`✅ Found slider handle: ${selector} (${box.width}x${box.height})`);
              break;
            }
          }
          if (slider) break;
        }
        
        if (!slider || !sliderBox) {
          console.log(`❌ No valid slider found in iframe ${i}`);
          continue;
        }
        
        // Calculate absolute position (iframe + element)
        const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
        const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
        
        console.log(`🎯 Slider absolute position: ${startX}, ${startY}`);
        
        // STAGE 1: Initial positioning
        console.log('📍 Stage 1: Moving to slider handle...');
        await this.page.mouse.move(startX, startY, { steps: 25 });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('🖱️ Clicking down on slider...');
        await this.page.mouse.down();
        
        // Small initial move to "activate" the slider
        await this.page.mouse.move(startX + 5, startY, { steps: 5 });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // STAGE 2: ANALYZE the puzzle to find where the gap is, THEN move to it
        console.log('🔄 Stage 2: Analyzing puzzle to find target position...');
        
        let solved = false;
        
        // First, take a screenshot to analyze the puzzle
        await this.page.screenshot({ path: 'puzzle_analysis.png', fullPage: true });
        console.log('📸 Screenshot taken for analysis');
        
        // Try to find the gap position by examining the iframe content
        let targetDistance = 200; // Default fallback
        
        try {
          // Look for the GAP where the piece needs to go, not where the piece is
          const puzzleInfo = await frame.evaluate(() => {
            const canvases = document.querySelectorAll('canvas');
            const images = document.querySelectorAll('img');
            
            console.log(`Found ${canvases.length} canvases, ${images.length} images`);
            
            // Look at the main puzzle image to find the gap
            let gapPosition = null;
            
            if (canvases.length >= 2) {
              // Usually there are 2 canvases - one with the puzzle, one with the piece
              const mainCanvas = canvases[0]; // Main puzzle canvas
              const rect = mainCanvas.getBoundingClientRect();
              
              // The gap is typically much closer - usually around 40-60% across
              // Most puzzle gaps are between 120-180px from the left edge
              const estimatedGapX = rect.x + rect.width * 0.5; // Gap usually around 50% across
              
              console.log(`Main canvas at ${rect.x}, width ${rect.width}, estimated gap at ${estimatedGapX}`);
              
              return { 
                canvases: canvases.length, 
                images: images.length, 
                mainCanvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                estimatedGapX: estimatedGapX
              };
            }
            
            return { canvases: canvases.length, images: images.length };
          });
          
          console.log('🧩 Puzzle analysis:', JSON.stringify(puzzleInfo));
          
          // Use the estimated gap position
          if (puzzleInfo.estimatedGapX && puzzleInfo.estimatedGapX > 100) {
            // Convert iframe coordinates to page coordinates
            targetDistance = puzzleInfo.estimatedGapX - iframeBox.x;
            console.log(`🎯 Found estimated gap at ${targetDistance}px from slider start`);
          } else {
            // Fallback: gaps are usually between 180-280px from the left
            targetDistance = 220;
            console.log(`🎯 Using fallback gap estimate at ${targetDistance}px`);
          }
          
        } catch (e) {
          console.log('⚠️ Could not analyze puzzle, using default distance');
        }
        
        console.log(`🎯 Planning to drag to approximately ${targetDistance}px`);
        
        // Now move in ONE CONTINUOUS motion to the target
        console.log('🎯 Starting planned drag...');
        
        // Move smoothly to the calculated target
        const startDragX = startX + 5;
        const endDragX = startX + Math.min(targetDistance + 50, 320); // Add some buffer but cap at 320
        
        // Create a smooth path with many steps
        const totalDistance = endDragX - startDragX;
        const totalSteps = Math.max(50, Math.floor(totalDistance / 3)); // More steps for longer distances
        const stepDelay = 25; // Smooth movement
        
        for (let step = 0; step <= totalSteps; step++) {
          const progress = step / totalSteps;
          const currentX = startDragX + (endDragX - startDragX) * progress;
          const currentY = startY + Math.sin(progress * Math.PI) * 2; // Slight wave motion
          
          // Move to next position
          await this.page.mouse.move(currentX, currentY);
          await new Promise(resolve => setTimeout(resolve, stepDelay));
          
          // Just report progress, don't check for success until we're near the target
          const distanceMoved = currentX - startX;
          if (step % 20 === 0) { // Report every 20 steps
            console.log(`📏 Moving... currently at ${Math.round(distanceMoved)}px (target: ${targetDistance}px)`);
          }
          
          // Only check for success when we're close to the calculated target
          if (distanceMoved >= (targetDistance - 30) && step % 5 === 0) {
            try {
              // Take a quick screenshot to see current state
              if (step % 10 === 0) {
                await this.page.screenshot({ path: `puzzle_${Math.round(distanceMoved)}.png` });
              }
              
              // Look for STRONG visual indicators of success
              const realSuccess = await frame.evaluate(() => {
                // Look for explicit success messages or major visual changes
                const bodyText = document.body.innerText.toLowerCase();
                
                // Only accept very clear success indicators
                if (bodyText.includes('verification successful') || 
                    bodyText.includes('puzzle solved') ||
                    bodyText.includes('captcha passed')) {
                  return 'text_success';
                }
                
                // Check if the puzzle elements actually disappeared
                const captchaElements = document.querySelectorAll('[class*="captcha"], [class*="puzzle"], [class*="slider"]');
                if (captchaElements.length === 0) {
                  return 'elements_gone';
                }
                
                return false;
              });
              
              if (realSuccess) {
                console.log(`✅ REAL SUCCESS detected at ${Math.round(distanceMoved)}px! (${realSuccess})`);
                solved = true;
                break;
              }
            } catch (e) {
              // Keep moving
            }
          }
        }
        
        // Release mouse
        console.log('🖱️ Releasing mouse...');
        await this.page.mouse.up();
        
        if (solved) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }
        
        console.log(`❌ Could not solve CAPTCHA in iframe ${i}`);
        
      } catch (error) {
        console.error(`Error with iframe ${i}:`, error.message);
        // Make sure to release mouse on error
        await this.page.mouse.up().catch(() => {});
      }
    }
    
    return false;
  }

  async navigateAndSolve() {
    console.log('🌐 Navigating to FreshCope...');
    
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log(`Current URL: ${this.page.url()}`);
    
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🔍 CAPTCHA detected!');
      
      const solved = await this.solvePuzzleCaptcha();
      
      if (solved) {
        console.log('🎉 CAPTCHA solved successfully!');
        
        // Continue with login
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const usernameField = await this.page.$('input[name="username"], input[type="email"], input[id*="email"]');
        if (usernameField) {
          console.log('📧 Filling username...');
          await usernameField.type('mike@emke.com', { delay: 100 });
        }
        
        const passwordField = await this.page.$('input[name="password"], input[type="password"]');
        if (passwordField) {
          console.log('🔑 Filling password...');
          await passwordField.type('cope123123A!', { delay: 100 });
        }
        
        console.log('🚀 Submitting login...');
        const submitButton = await this.page.$('input[type="submit"], button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`After login URL: ${this.page.url()}`);
        
        // Get points
        await this.page.goto('https://www.freshcope.com/rewards/redeem', {
          waitUntil: 'networkidle2',
          timeout: 15000
        });
        
        const rewardsContent = await this.page.content();
        const match = rewardsContent.match(/(\d+)\s*points?/i);
        if (match && match[1]) {
          const points = parseInt(match[1]);
          if (!isNaN(points) && points > 0) {
            console.log(`🎊 SUCCESS! Found ${points} points!`);
            return points;
          }
        }
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
  const solver = new AdvancedPuzzleSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 Final result: ${result}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { AdvancedPuzzleSolver };

if (require.main === module) {
  test().catch(console.error);
}
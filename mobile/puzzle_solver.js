#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class PuzzleCaptchaSolver {
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
        '--disable-dev-shm-usage'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 390, height: 844 });
    
    // Hide webdriver property
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  async solvePuzzleCaptcha() {
    console.log('🧩 Starting puzzle CAPTCHA solver...');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Look for iframe
    const iframes = await this.page.$$('iframe');
    if (iframes.length === 0) {
      console.log('❌ No iframe found');
      return false;
    }
    
    console.log(`Found ${iframes.length} iframe(s)`);
    
    try {
      const iframeBox = await iframes[0].boundingBox();
      const frame = await iframes[0].contentFrame();
      
      if (!frame) {
        console.log('❌ Cannot access iframe');
        return false;
      }
      
      // Find the slider handle
      const sliderSelectors = [
        '[class*="slider"]',
        '.captcha-slider',
        '[class*="drag"]',
        '.slider-handle',
        '[draggable="true"]'
      ];
      
      let slider = null;
      let sliderBox = null;
      
      for (const selector of sliderSelectors) {
        slider = await frame.$(selector);
        if (slider) {
          sliderBox = await slider.boundingBox();
          if (sliderBox) {
            console.log(`✅ Found slider: ${selector}`);
            break;
          }
        }
      }
      
      if (!slider || !sliderBox) {
        console.log('❌ No slider found');
        return false;
      }
      
      // Calculate absolute position
      const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
      const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
      
      console.log(`🎯 Slider position: ${startX}, ${startY}`);
      
      // Move mouse to slider
      console.log('👆 Moving to slider...');
      await this.page.mouse.move(startX, startY, { steps: 10 });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Click and hold
      console.log('🖱️ Clicking down...');
      await this.page.mouse.down();
      
      // Try different distances to find the correct position
      // Based on the Medium article, we should move incrementally and check
      const distances = [50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];
      
      for (const distance of distances) {
        console.log(`📏 Trying distance: ${distance}px`);
        
        // Move to new position smoothly
        const targetX = startX + distance;
        
        // Move with some randomness on Y axis like in the article
        const randomY = startY + (Math.random() - 0.5) * 5;
        
        // Smooth movement
        await this.page.mouse.move(targetX, randomY, { steps: 15 });
        
        // Small pause to let the puzzle update
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check if solved (look for success indicators)
        try {
          const frameContent = await frame.content();
          const pageContent = await this.page.content();
          
          if (frameContent.toLowerCase().includes('success') ||
              frameContent.toLowerCase().includes('verified') ||
              frameContent.toLowerCase().includes('complete') ||
              !frameContent.toLowerCase().includes('captcha') ||
              pageContent.toLowerCase().includes('success')) {
            console.log(`✅ CAPTCHA solved at ${distance}px!`);
            await this.page.mouse.up();
            return true;
          }
        } catch (e) {
          // Frame might have changed, continue
        }
      }
      
      // If no success, try releasing at current position
      console.log('🎲 Releasing at final position...');
      await this.page.mouse.up();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Final check
      const finalContent = await this.page.content();
      if (!finalContent.toLowerCase().includes('captcha')) {
        console.log('✅ CAPTCHA appears to be solved!');
        return true;
      }
      
      console.log('❌ CAPTCHA not solved');
      return false;
      
    } catch (error) {
      console.error('Error:', error.message);
      await this.page.mouse.up(); // Make sure to release mouse
      return false;
    }
  }

  async navigateAndSolve() {
    console.log('🌐 Navigating to FreshCope...');
    
    // Start with main site to get JWT redirect
    await this.page.goto('https://www.freshcope.com/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log(`Current URL: ${this.page.url()}`);
    
    // Check for CAPTCHA
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🔍 CAPTCHA detected!');
      
      const solved = await this.solvePuzzleCaptcha();
      
      if (solved) {
        console.log('🎉 CAPTCHA solved! Proceeding with login...');
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to login
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
        
        // Submit
        console.log('🚀 Submitting login...');
        const submitButton = await this.page.$('input[type="submit"], button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`Final URL: ${this.page.url()}`);
        
        // Try to get points
        await this.page.goto('https://www.freshcope.com/rewards/redeem', {
          waitUntil: 'networkidle2',
          timeout: 15000
        });
        
        const rewardsContent = await this.page.content();
        
        // Look for points
        const patterns = [
          /(\d+)\s*points?/i,
          /balance[:\s]*(\d+)/i
        ];
        
        for (const pattern of patterns) {
          const match = rewardsContent.match(pattern);
          if (match && match[1]) {
            const points = parseInt(match[1]);
            if (!isNaN(points) && points > 0) {
              console.log(`🎊 SUCCESS! Found ${points} points!`);
              return points;
            }
          }
        }
        
        console.log('❌ Could not find points');
        return null;
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

// Test
async function test() {
  const solver = new PuzzleCaptchaSolver();
  await solver.init();
  
  try {
    const result = await solver.navigateAndSolve();
    console.log(`🏁 Final result: ${result}`);
  } finally {
    console.log('Press Ctrl+C to close...');
    await new Promise(() => {});
  }
}

module.exports = { PuzzleCaptchaSolver };

if (require.main === module) {
  test().catch(console.error);
}
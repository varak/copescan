#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class CaptchaSolver {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({ 
      headless: false, // Show browser so we can see what's happening
      slowMo: 150, // Add delay between actions for visibility
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic viewport for mobile
    await this.page.setViewport({ width: 390, height: 844 });
    
    // Add more human-like properties
    await this.page.evaluateOnNewDocument(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Add realistic plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Add realistic languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      return originalQuery.apply(this, arguments);
    });
    
    // Set realistic user agent
    await this.page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    
    // Add realistic headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
  }

  async solveSlidePuzzle() {
    console.log('🧩 Attempting to solve slide puzzle CAPTCHA...');
    
    try {
      // First, let's see what elements are actually on the page
      await this.page.screenshot({ path: 'captcha_analysis.png', fullPage: true });
      
      // Get all interactive elements
      const allElements = await this.page.$$('*');
      console.log(`Found ${allElements.length} total elements on page`);
      
      // Look for ANY draggable or clickable elements
      const interactiveElements = await this.page.evaluate(() => {
        const elements = [];
        document.querySelectorAll('*').forEach((el, index) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          if (rect.width > 10 && rect.height > 10 && 
              (style.cursor === 'pointer' || style.cursor === 'grab' || style.cursor === 'move' ||
               el.draggable || el.onclick || 
               el.className.toLowerCase().includes('drag') ||
               el.className.toLowerCase().includes('slide') ||
               el.className.toLowerCase().includes('puzzle') ||
               el.className.toLowerCase().includes('captcha'))) {
            elements.push({
              index,
              tag: el.tagName,
              className: el.className,
              id: el.id,
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              cursor: style.cursor
            });
          }
        });
        return elements;
      });
      
      console.log(`Found ${interactiveElements.length} interactive elements:`, interactiveElements);
      
      // Look for common slide puzzle elements
      const puzzleSelectors = [
        'iframe', // Many CAPTCHAs are in iframes
        '.captcha-slider',
        '[class*="slider"]',
        '[class*="puzzle"]',
        '[class*="captcha"]',
        '.slide-puzzle',
        '#captcha-slider',
        '[data-slider]',
        'canvas', // Some CAPTCHAs use canvas
        '[draggable="true"]'
      ];
      
      let sliderElement = null;
      let sliderHandle = null;
      
      // Check for iframes first (many CAPTCHAs are in iframes)
      const iframes = await this.page.$$('iframe');
      if (iframes.length > 0) {
        console.log(`Found ${iframes.length} iframes, checking for CAPTCHA...`);
        
        // Wait for iframes to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        for (let i = 0; i < iframes.length; i++) {
          try {
            // Wait for iframe to be ready
            await this.page.waitForFunction(
              (index) => {
                const iframe = document.querySelectorAll('iframe')[index];
                return iframe && iframe.contentDocument && iframe.contentDocument.readyState === 'complete';
              },
              { timeout: 5000 },
              i
            );
            
            const frame = await iframes[i].contentFrame();
            if (frame) {
              console.log(`Checking iframe ${i} for CAPTCHA elements...`);
              
              // Look for CAPTCHA elements inside iframe
              for (const selector of puzzleSelectors.slice(1)) { // Skip 'iframe' selector
                const element = await frame.$(selector);
                if (element) {
                  console.log(`Found CAPTCHA element in iframe ${i}: ${selector}`);
                  
                  // Switch context to iframe and try to solve
                  const box = await element.boundingBox();
                  if (box) {
                    console.log(`CAPTCHA element box: ${JSON.stringify(box)}`);
                    
                    // Get iframe position on main page
                    const iframeBox = await iframes[i].boundingBox();
                    console.log(`Iframe position: ${JSON.stringify(iframeBox)}`);
                    
                    // Calculate absolute coordinates (iframe position + element position)
                    const absoluteX = iframeBox.x + box.x + box.width/2;
                    const absoluteY = iframeBox.y + box.y + box.height/2;
                    
                    console.log(`Absolute CAPTCHA position: ${absoluteX}, ${absoluteY}`);
                    
                    // Wait longer to simulate human thinking time (3-6 seconds)
                    const thinkingTime = 3000 + Math.random() * 3000;
                    console.log(`🤔 Simulating human thinking time: ${Math.round(thinkingTime)}ms`);
                    console.log('🔍 WATCH THE SCREEN - You should see the mouse move automatically in a few seconds...');
                    await new Promise(resolve => setTimeout(resolve, thinkingTime));
                    
                    console.log('👆 NOW WATCH: Moving mouse to CAPTCHA position...');
                    
                    // Move to position very slowly and visibly
                    await this.page.mouse.move(absoluteX, absoluteY, { steps: 25 });
                    
                    console.log('🔍 NOW WATCH: Hovering over the element to trigger movement...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    console.log('🖱️ NOW WATCH: Clicking down and immediately dragging...');
                    await this.page.mouse.down();
                    
                    // Start dragging immediately without any delay
                    const dragDistance = 250;
                    
                    // Use page.mouse.move which should be more reliable
                    await this.page.mouse.move(absoluteX + dragDistance, absoluteY, { steps: 30 });
                    
                    console.log('🖱️ NOW WATCH: Releasing the mouse...');
                    await this.page.mouse.up();
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Check if solved
                    const mainContent = await this.page.content();
                    const frameContent = await frame.content();
                    
                    if (!mainContent.toLowerCase().includes('captcha') || 
                        !frameContent.toLowerCase().includes('captcha') ||
                        frameContent.toLowerCase().includes('success') ||
                        frameContent.toLowerCase().includes('verified')) {
                      console.log('🎉 CAPTCHA SOLVED! Puzzle piece dragged successfully!');
                      return true;
                    }
                    
                    console.log('❌ CAPTCHA NOT SOLVED - trying alternative approach...');
                    
                    // Try clicking directly on different parts of the slider
                    console.log('🎯 Trying direct clicks on slider positions...');
                    const clickPositions = [
                      absoluteX + 100,
                      absoluteX + 150, 
                      absoluteX + 200,
                      absoluteX + 250
                    ];
                    
                    for (const clickX of clickPositions) {
                      console.log(`👆 Clicking at position ${clickX}...`);
                      await this.page.mouse.click(clickX, absoluteY);
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      const content = await this.page.content();
                      if (!content.toLowerCase().includes('captcha')) {
                        console.log('✅ CAPTCHA solved with click!');
                        return true;
                      }
                    }
                    
                    console.log('❌ All attempts failed - CAPTCHA not solved automatically');
                    return false;
                  }
                }
              }
            }
          } catch (e) {
            console.log(`Could not access iframe ${i}:`, e.message);
          }
        }
      }
      
      // Try to find the slider element in main page
      for (const selector of puzzleSelectors) {
        try {
          sliderElement = await this.page.$(selector);
          if (sliderElement) {
            console.log(`Found slider with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!sliderElement) {
        // Look for drag handles
        const handleSelectors = [
          '.slider-handle',
          '.drag-handle',
          '[class*="handle"]',
          '[class*="drag"]',
          '.captcha-handle'
        ];
        
        for (const selector of handleSelectors) {
          try {
            sliderHandle = await this.page.$(selector);
            if (sliderHandle) {
              console.log(`Found slider handle: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // If we found a slider or handle, try to solve it
      if (sliderElement || sliderHandle) {
        const element = sliderElement || sliderHandle;
        
        // Get the bounding box
        const box = await element.boundingBox();
        console.log(`Element position: ${box.x}, ${box.y}, ${box.width}x${box.height}`);
        
        // Take screenshot before solving
        await this.page.screenshot({ path: 'captcha_before.png' });
        
        // Try different drag distances
        const dragDistances = [100, 150, 200, 250, 300];
        
        for (const distance of dragDistances) {
          console.log(`Trying drag distance: ${distance}px`);
          
          // Drag the slider to the right
          await this.page.mouse.move(box.x + box.width/2, box.y + box.height/2);
          await this.page.mouse.down();
          await this.page.mouse.move(box.x + distance, box.y + box.height/2, { steps: 10 });
          await this.page.mouse.up();
          
          // Wait a moment for validation
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if CAPTCHA was solved (page changed or success indicator)
          const currentUrl = this.page.url();
          const pageContent = await this.page.content();
          
          if (!pageContent.toLowerCase().includes('captcha') || 
              pageContent.toLowerCase().includes('success') ||
              pageContent.toLowerCase().includes('verified')) {
            console.log('✅ CAPTCHA appears to be solved!');
            await this.page.screenshot({ path: 'captcha_solved.png' });
            return true;
          }
          
          // Reset for next attempt
          await this.page.reload();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Re-find element after reload
          try {
            const newElement = await this.page.$(puzzleSelectors.find(s => true));
            if (newElement) {
              const newBox = await newElement.boundingBox();
              box.x = newBox.x;
              box.y = newBox.y;
            }
          } catch (e) {
            // Continue with original coordinates
          }
        }
      }
      
      // If no slider found, look for image-based puzzle
      return await this.solveImagePuzzle();
      
    } catch (error) {
      console.error('Error solving slide puzzle:', error.message);
      return false;
    }
  }

  async solveImagePuzzle() {
    console.log('🖼️ Looking for image-based puzzle...');
    
    try {
      // Look for puzzle piece that needs to be dragged
      const pieceSelectors = [
        '.puzzle-piece',
        '[class*="piece"]',
        '.captcha-piece',
        '[class*="drag"]'
      ];
      
      for (const selector of pieceSelectors) {
        const pieces = await this.page.$$(selector);
        if (pieces.length > 0) {
          console.log(`Found ${pieces.length} puzzle pieces`);
          
          // Try dragging the first piece to different positions
          const piece = pieces[0];
          const pieceBox = await piece.boundingBox();
          
          // Look for target area or gap
          const targetSelectors = [
            '.puzzle-target',
            '.drop-zone',
            '[class*="target"]',
            '[class*="gap"]'
          ];
          
          for (const targetSelector of targetSelectors) {
            const target = await this.page.$(targetSelector);
            if (target) {
              const targetBox = await target.boundingBox();
              
              console.log('Dragging puzzle piece to target...');
              await this.page.mouse.move(pieceBox.x + pieceBox.width/2, pieceBox.y + pieceBox.height/2);
              await this.page.mouse.down();
              await this.page.mouse.move(targetBox.x + targetBox.width/2, targetBox.y + targetBox.height/2, { steps: 15 });
              await this.page.mouse.up();
              
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const pageContent = await this.page.content();
              if (!pageContent.toLowerCase().includes('captcha')) {
                console.log('✅ Image puzzle solved!');
                return true;
              }
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error solving image puzzle:', error.message);
      return false;
    }
  }

  async navigateAndSolve(url) {
    console.log(`🌐 Navigating to: ${url}`);
    
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take initial screenshot
    await this.page.screenshot({ path: 'page_initial.png' });
    
    // Check if CAPTCHA is present
    const content = await this.page.content();
    if (content.toLowerCase().includes('captcha')) {
      console.log('🔍 CAPTCHA detected, attempting to solve...');
      
      const solved = await this.solveSlidePuzzle();
      return solved;
    }
    
    console.log('ℹ️ No CAPTCHA detected');
    return true;
  }

  async solveInFrame(frame, element, box) {
    console.log('🎯 Solving CAPTCHA within iframe...');
    
    // Try multiple drag approaches within the iframe
    const dragDistances = [50, 100, 150, 200, 250, 300];
    
    for (const distance of dragDistances) {
      console.log(`Trying iframe drag distance: ${distance}px`);
      
      try {
        // Click and drag within the iframe context
        await frame.evaluate((elementSelector, dist) => {
          const el = document.querySelector(elementSelector);
          if (el) {
            const rect = el.getBoundingClientRect();
            
            // Simulate mouse events
            const mouseDown = new MouseEvent('mousedown', {
              clientX: rect.x + rect.width/2,
              clientY: rect.y + rect.height/2,
              bubbles: true
            });
            
            const mouseMove = new MouseEvent('mousemove', {
              clientX: rect.x + dist,
              clientY: rect.y + rect.height/2,
              bubbles: true
            });
            
            const mouseUp = new MouseEvent('mouseup', {
              clientX: rect.x + dist,
              clientY: rect.y + rect.height/2,
              bubbles: true
            });
            
            el.dispatchEvent(mouseDown);
            setTimeout(() => el.dispatchEvent(mouseMove), 100);
            setTimeout(() => el.dispatchEvent(mouseUp), 200);
          }
        }, element, distance);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if solved
        const content = await this.page.content();
        if (!content.toLowerCase().includes('captcha')) {
          console.log('✅ CAPTCHA solved in iframe!');
          return true;
        }
      } catch (e) {
        console.log(`Iframe drag attempt failed: ${e.message}`);
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

// Export for use in other modules
module.exports = { CaptchaSolver };

// Test if run directly
async function test() {
  const solver = new CaptchaSolver();
  await solver.init();
  
  try {
    const solved = await solver.navigateAndSolve('https://www.freshcope.com/rewards/earn');
    console.log(`CAPTCHA solving result: ${solved ? 'SUCCESS' : 'FAILED'}`);
  } finally {
    await solver.close();
  }
}

if (require.main === module) {
  test().catch(console.error);
}
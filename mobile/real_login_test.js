#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function realLoginTest() {
  console.log('🚪 REAL LOGIN TEST - Actually filling credentials on screen...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  console.log('🚪 Going to login page...');
  await page.goto('https://www.freshcope.com/login', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('👀 Looking for login fields on screen...');
  
  // Take screenshot to see what's there
  await page.screenshot({ path: 'login_page.png' });
  console.log('📸 Screenshot saved as login_page.png');
  
  // Try to find and fill username field
  try {
    console.log('📝 Looking for username field...');
    
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="email"]', 
      'input[type="email"]',
      'input[id*="username"]',
      'input[id*="email"]',
      'input[placeholder*="username"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Username"]',
      'input[placeholder*="Email"]'
    ];
    
    let usernameField = null;
    for (const selector of usernameSelectors) {
      try {
        const field = await page.$(selector);
        if (field) {
          console.log(`✅ Found username field: ${selector}`);
          usernameField = field;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (usernameField) {
      console.log('📝 Clicking username field...');
      await usernameField.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('⌨️ Typing username (you should see this on screen)...');
      await page.keyboard.type('test_username_here', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('❌ No username field found - checking all input fields...');
      const allInputs = await page.$$('input');
      console.log(`Found ${allInputs.length} input fields total`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const inputType = await allInputs[i].evaluate(el => el.type);
        const inputName = await allInputs[i].evaluate(el => el.name);
        const inputId = await allInputs[i].evaluate(el => el.id);
        console.log(`  Input ${i}: type=${inputType}, name=${inputName}, id=${inputId}`);
      }
    }
    
  } catch (e) {
    console.log(`❌ Login field error: ${e.message}`);
  }
  
  console.log('🔍 Taking final screenshot...');
  await page.screenshot({ path: 'after_login_attempt.png' });
  
  // Check if CAPTCHA appeared
  const content = await page.content();
  if (content.toLowerCase().includes('captcha')) {
    console.log('🎯 CAPTCHA appeared after login attempt!');
    
    // Try basic movement on the CAPTCHA
    console.log('🎯 Trying movement on login-triggered CAPTCHA...');
    
    const iframes = await page.$$('iframe');
    if (iframes.length > 0) {
      const frame = await iframes[0].contentFrame();
      const iframeBox = await iframes[0].boundingBox();
      
      const slider = await frame.$('[class*="slider"]:not([class*="track"])');
      if (slider) {
        const sliderBox = await slider.boundingBox();
        
        const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
        const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
        
        console.log('🖱️ Testing movement on login CAPTCHA...');
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        
        for (let i = 0; i <= 30; i++) {
          const currentX = startX + (120 * (i / 30));
          await page.mouse.move(currentX, startY);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (i % 10 === 0) {
            console.log(`🖱️ Login CAPTCHA movement: ${Math.round(120 * (i / 30))}px`);
          }
        }
        
        await page.mouse.up();
        console.log('🖱️ Login CAPTCHA movement complete');
      }
    }
  } else {
    console.log('ℹ️ No CAPTCHA appeared - might need real credentials');
  }
  
  console.log('🏁 Real login test complete - check screenshots!');
  await new Promise(() => {}); // Keep open
}

realLoginTest().catch(console.error);
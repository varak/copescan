#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function tryAudioCaptcha() {
  console.log('🔊 AUDIO CAPTCHA APPROACH - This could be MUCH easier!');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  await page.goto('https://www.freshcope.com/', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const content = await page.content();
  if (!content.toLowerCase().includes('captcha')) {
    console.log('❌ No CAPTCHA found');
    return;
  }
  
  console.log('🎯 CAPTCHA found - looking for audio button...');
  
  const iframes = await page.$$('iframe');
  const frame = await iframes[0].contentFrame();
  
  // Look for audio button
  console.log('🔊 Searching for audio CAPTCHA button...');
  
  try {
    // Common audio button selectors
    const audioSelectors = [
      '[title*="audio"]',
      '[aria-label*="audio"]',
      'button[title*="Audio"]',
      'button[aria-label*="Audio"]',
      '[class*="audio"]',
      '[id*="audio"]',
      'button:contains("Audio")',
      '[title*="hearing"]',
      '[aria-label*="hearing"]',
      '[title*="sound"]',
      '[aria-label*="sound"]'
    ];
    
    let audioButton = null;
    
    for (const selector of audioSelectors) {
      try {
        const button = await frame.$(selector);
        if (button) {
          console.log(`🔊 Found audio button with selector: ${selector}`);
          audioButton = button;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!audioButton) {
      // Try to find any buttons and check their text/attributes
      console.log('🔍 Checking all buttons for audio option...');
      const allButtons = await frame.$$('button, [role="button"], div[tabindex], span[tabindex]');
      
      for (let i = 0; i < allButtons.length; i++) {
        try {
          const buttonText = await allButtons[i].evaluate(el => el.textContent);
          const buttonTitle = await allButtons[i].evaluate(el => el.title);
          const buttonAriaLabel = await allButtons[i].evaluate(el => el.getAttribute('aria-label'));
          
          console.log(`Button ${i}: text="${buttonText}", title="${buttonTitle}", aria-label="${buttonAriaLabel}"`);
          
          if (buttonText?.toLowerCase().includes('audio') || 
              buttonTitle?.toLowerCase().includes('audio') ||
              buttonAriaLabel?.toLowerCase().includes('audio') ||
              buttonText?.toLowerCase().includes('sound') ||
              buttonTitle?.toLowerCase().includes('sound') ||
              buttonAriaLabel?.toLowerCase().includes('sound')) {
            console.log(`🔊 FOUND AUDIO BUTTON: Button ${i}`);
            audioButton = allButtons[i];
            break;
          }
        } catch (e) {
          // Skip this button
        }
      }
    }
    
    if (audioButton) {
      console.log('🔊 CLICKING AUDIO BUTTON!');
      await audioButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('🔊 Audio CAPTCHA should be active now!');
      console.log('🎧 Looking for audio controls...');
      
      // Look for play button or audio element
      const audioElements = await frame.$$('audio, button[title*="play"], button[aria-label*="play"], [class*="play"]');
      console.log(`Found ${audioElements.length} potential audio elements`);
      
      if (audioElements.length > 0) {
        console.log('🔊 Trying to play audio...');
        await audioElements[0].click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Look for text input field
      const textInputs = await frame.$$('input[type="text"], input:not([type])');
      if (textInputs.length > 0) {
        console.log('📝 Found text input - ready for audio numbers!');
        console.log('🎧 LISTEN TO THE AUDIO AND TELL ME THE NUMBERS!');
        
        // Wait longer for user to hear and process
        console.log('⏳ Waiting 30 seconds for COMPLETE audio sequence...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        console.log('📝 You can manually type the numbers you heard');
      } else {
        console.log('❌ No text input found for audio numbers');
      }
      
    } else {
      console.log('❌ No audio button found');
      
      // Take screenshot to see what's available
      await page.screenshot({ path: 'captcha_buttons.png' });
      console.log('📸 Screenshot saved as captcha_buttons.png');
    }
    
  } catch (e) {
    console.log(`❌ Audio CAPTCHA error: ${e.message}`);
  }
  
  console.log('🔊 Audio CAPTCHA attempt complete');
  await new Promise(() => {}); // Keep open
}

tryAudioCaptcha().catch(console.error);
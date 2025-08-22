#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function manualAudioSolver() {
  console.log('🎧 MANUAL AUDIO SOLVER - You listen, I type!');
  
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
  
  console.log('🎯 CAPTCHA found - switching to audio mode...');
  
  const iframes = await page.$$('iframe');
  const frame = await iframes[0].contentFrame();
  
  // Click audio button
  const audioButton = await frame.$('[title*="audio"]');
  if (audioButton) {
    console.log('🔊 Clicking audio button...');
    await audioButton.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to play audio
    console.log('🔊 Looking for play button...');
    const playButtons = await frame.$$('button, audio, [class*="play"], [role="button"]');
    
    console.log(`Found ${playButtons.length} potential play elements`);
    
    // Try clicking the first few elements
    for (let i = 0; i < Math.min(3, playButtons.length); i++) {
      console.log(`🔊 Trying play element ${i}...`);
      try {
        await playButtons[i].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.log(`❌ Element ${i} failed to click`);
      }
    }
    
    console.log('🎧 AUDIO SHOULD BE PLAYING NOW!');
    console.log('🎧 Listen to the numbers and tell me what you hear!');
    console.log('⏳ I\'ll wait 10 seconds for you to listen...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('📝 What numbers did you hear? (I\'ll type them automatically)');
    
    // For now, let's try some common patterns
    const testNumbers = ['123', '456', '789', '012', '345', '678'];
    
    const textInput = await frame.$('input[type="text"], input:not([type])');
    if (textInput) {
      for (const numbers of testNumbers) {
        console.log(`🧪 Testing numbers: ${numbers}`);
        
        // Clear and type
        await textInput.click();
        await textInput.evaluate(el => el.value = '');
        await textInput.type(numbers);
        
        // Submit
        await textInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const testContent = await page.content();
        if (!testContent.toLowerCase().includes('captcha')) {
          console.log(`🎉 SUCCESS with numbers: ${numbers}!`);
          return true;
        }
        
        console.log(`❌ ${numbers} failed, trying next...`);
      }
    }
    
    console.log('💡 Manual mode: Type the numbers you heard manually!');
    
  } else {
    console.log('❌ No audio button found');
  }
  
  console.log('🎧 Keeping browser open for manual audio solving...');
  await new Promise(() => {}); // Keep open
}

manualAudioSolver().catch(console.error);
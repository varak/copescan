#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function autoTypeAudio() {
  console.log('🎧 AUTO-TYPE AUDIO - You hear it, I type it!');
  
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Play audio
    console.log('🔊 Playing audio...');
    const audioElements = await frame.$$('audio, button[title*="play"], button[aria-label*="play"], [class*="play"]');
    if (audioElements.length > 0) {
      await audioElements[0].click();
    }
    
    console.log('🎧 LISTENING FOR COMPLETE AUDIO...');
    console.log('🎧 (Audio should be playing and showing visually)');
    console.log('⏳ Waiting for you to hear ALL the numbers...');
    
    // Wait for complete audio
    await new Promise(resolve => setTimeout(resolve, 25000));
    
    console.log('📝 What numbers did you hear? Tell me and I\'ll type them!');
    
    // Function to type numbers when told
    async function typeNumbers(numbers) {
      const textInput = await frame.$('input[type="text"], input:not([type])');
      if (textInput) {
        console.log(`⌨️ Typing: ${numbers}`);
        await textInput.click();
        await textInput.type(numbers, { delay: 100 });
        await textInput.press('Enter');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const result = await page.content();
        if (!result.toLowerCase().includes('captcha')) {
          console.log('🎉 AUDIO CAPTCHA SOLVED!');
          return true;
        } else {
          console.log('❌ That didn\'t work - try again with new audio');
          return false;
        }
      }
      return false;
    }
    
    // For now, try the number you just heard
    console.log('🧪 Trying the numbers you heard: 127241');
    const success = await typeNumbers('127241');
    
    if (!success) {
      console.log('💡 Ready for next audio sequence - tell me what you hear!');
    }
    
  } else {
    console.log('❌ No audio button found');
  }
  
  console.log('🎧 Ready for new audio CAPTCHAs!');
  await new Promise(() => {}); // Keep open
}

autoTypeAudio().catch(console.error);
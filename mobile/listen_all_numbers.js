#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function listenAllNumbers() {
  console.log('🎧 LISTEN TO ALL NUMBERS FIRST - No rushing!');
  
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
    
    console.log('🎧 LISTENING TO COMPLETE AUDIO SEQUENCE...');
    console.log('🎧 Waiting 15 seconds for ALL numbers to be spoken...');
    console.log('🎧 (No interruptions - letting it finish completely)');
    
    // Wait for the COMPLETE audio to finish
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('🎧 Audio should be complete now!');
    console.log('🎧 What numbers did you hear in the COMPLETE sequence?');
    console.log('📝 Tell me and I\'ll type them all at once!');
    
    // Find the input field for manual entry
    const textInput = await frame.$('input[type="text"], input:not([type])');
    if (textInput) {
      console.log('📝 Text input field is ready');
      console.log('💡 You can type the complete sequence you heard');
    }
    
  } else {
    console.log('❌ No audio button found');
  }
  
  console.log('🎧 Ready for comparison - what complete sequence did you hear?');
  await new Promise(() => {}); // Keep open
}

listenAllNumbers().catch(console.error);
#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function completeAudioSolver() {
  console.log('🎧 COMPLETE AUDIO SOLVER - Listen to EVERYTHING first!');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--allow-running-insecure-content'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  
  // Grant microphone permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://www.freshcope.com', ['microphone']);
  
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
    
    // Play audio and listen for the COMPLETE sequence
    const completeAudio = await frame.evaluate(() => {
      return new Promise((resolve) => {
        console.log('🎧 STARTING COMPLETE AUDIO LISTENING...');
        
        // Set up speech recognition for the FULL audio
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          console.log('❌ Speech recognition not available - using manual mode');
          resolve(null);
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening!
        recognition.interimResults = true; // Get partial results
        recognition.lang = 'en-US';
        
        let fullTranscript = '';
        
        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          fullTranscript = finalTranscript;
          console.log(`🎧 HEARING: "${fullTranscript}" (interim: "${interimTranscript}")`);
        };
        
        recognition.onerror = (event) => {
          console.log(`❌ Speech recognition error: ${event.error}`);
          resolve(null);
        };
        
        recognition.onend = () => {
          console.log('🎧 Audio complete - processing full transcript...');
          
          // Extract all numbers/letters from the complete transcript
          const cleanText = fullTranscript.replace(/[^a-zA-Z0-9]/g, '');
          console.log(`🔤 COMPLETE AUDIO RESULT: "${cleanText}"`);
          resolve(cleanText);
        };
        
        // Find and play audio
        const audioElements = document.querySelectorAll('audio, button[title*="play"], button[aria-label*="play"], [class*="play"]');
        
        if (audioElements.length > 0) {
          console.log('🔊 Playing complete audio...');
          audioElements[0].click();
          
          // Start listening immediately
          setTimeout(() => {
            console.log('🎧 Starting continuous listening for FULL audio...');
            recognition.start();
          }, 500);
          
          // Let it run for 20 seconds to get the complete audio
          setTimeout(() => {
            console.log('🎧 Stopping after 20 seconds - should have complete audio');
            recognition.stop();
          }, 20000);
          
        } else {
          console.log('❌ No audio elements found');
          resolve(null);
        }
      });
    });
    
    if (completeAudio) {
      console.log(`🎉 COMPLETE AUDIO RECOGNIZED: "${completeAudio}"`);
      
      // Now type it ALL AT ONCE like a human
      const textInput = await frame.$('input[type="text"], input:not([type])');
      if (textInput) {
        console.log('📝 Typing complete audio result...');
        await textInput.click();
        await textInput.type(completeAudio, { delay: 100 }); // Human-like typing
        
        console.log('⌨️ Submitting complete audio...');
        await textInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalContent = await page.content();
        if (!finalContent.toLowerCase().includes('captcha')) {
          console.log('🎉🎉🎉 COMPLETE AUDIO CAPTCHA SOLVED! 🎉🎉🎉');
          return true;
        }
      }
    } else {
      console.log('🎧 Speech recognition failed - manual mode active');
      console.log('💡 You can type the numbers you hear manually!');
    }
  }
  
  console.log('🎧 Complete audio solver running - compare what we both hear!');
  await new Promise(() => {}); // Keep open for comparison
}

completeAudioSolver().catch(console.error);
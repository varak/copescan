#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function speechRecognitionSolver() {
  console.log('🎤 SPEECH RECOGNITION CAPTCHA SOLVER - Like OCR but for audio!');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
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
    
    // Set up speech recognition in the browser
    const speechResult = await frame.evaluate(() => {
      return new Promise((resolve) => {
        console.log('🎤 Starting speech recognition...');
        
        // Check if speech recognition is available
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          console.log('❌ Speech recognition not available');
          resolve(null);
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log(`🎤 HEARD: "${transcript}"`);
          
          // Extract numbers from the transcript
          const numbers = transcript.replace(/\D/g, '');
          console.log(`🔢 NUMBERS: "${numbers}"`);
          resolve(numbers);
        };
        
        recognition.onerror = (event) => {
          console.log(`❌ Speech recognition error: ${event.error}`);
          resolve(null);
        };
        
        recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
        };
        
        // Play the audio first - try multiple ways
        console.log('🔊 Looking for audio to play...');
        const audioElements = document.querySelectorAll('audio, button[title*="play"], button[aria-label*="play"], [class*="play"], button');
        
        let audioPlayed = false;
        
        for (let i = 0; i < audioElements.length; i++) {
          try {
            const element = audioElements[i];
            console.log(`🔊 Trying to play audio element ${i}...`);
            
            if (element.tagName === 'AUDIO') {
              console.log('🔊 Playing HTML audio element...');
              element.play();
              audioPlayed = true;
              break;
            } else {
              console.log('🔊 Clicking audio button...');
              element.click();
              audioPlayed = true;
              break;
            }
          } catch (e) {
            console.log(`❌ Failed to play element ${i}: ${e.message}`);
          }
        }
        
        if (audioPlayed) {
          console.log('✅ Audio should be playing now!');
          
          // Start listening after a short delay
          setTimeout(() => {
            console.log('🎤 Starting to listen...');
            recognition.start();
          }, 1000);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            recognition.stop();
            resolve(null);
          }, 10000);
        } else {
          console.log('❌ No audio elements found');
          resolve(null);
        }
      });
    });
    
    if (speechResult) {
      console.log(`🎉 SPEECH RECOGNITION SUCCESS: "${speechResult}"`);
      
      // Find text input and type the numbers
      const textInput = await frame.$('input[type="text"], input:not([type])');
      if (textInput) {
        console.log('📝 Typing recognized numbers...');
        await textInput.click();
        await textInput.type(speechResult);
        
        // Submit
        const submitButton = await frame.$('button[type="submit"], button:contains("Submit"), button:contains("Verify")');
        if (submitButton) {
          console.log('✅ Submitting audio CAPTCHA...');
          await submitButton.click();
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const finalContent = await page.content();
          if (!finalContent.toLowerCase().includes('captcha')) {
            console.log('🎉🎉🎉 AUDIO CAPTCHA SOLVED! 🎉🎉🎉');
            return true;
          }
        } else {
          // Try Enter key
          console.log('⌨️ Trying Enter key...');
          await textInput.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } else {
      console.log('❌ Speech recognition failed');
    }
  }
  
  console.log('🎤 Speech recognition attempt complete');
  await new Promise(() => {}); // Keep open
}

speechRecognitionSolver().catch(console.error);
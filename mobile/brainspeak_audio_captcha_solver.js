#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { spawn, exec } = require('child_process');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function brainspeakAudioSolver() {
  console.log('🧠 BRAINSPEAK AUDIO CAPTCHA SOLVER - Using proven audio capture!');
  
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🧠 STARTING BRAINSPEAK AUDIO CAPTURE...');
    
    // Use brainspeak audio capture system
    const capturedText = await captureAudioWithBrainspeak();
    
    if (capturedText && capturedText.trim()) {
      console.log(`🎉 BRAINSPEAK CAPTURED: "${capturedText}"`);
      
      // Type the captured text
      const textInput = await frame.$('input[type="text"], input:not([type])');
      if (textInput) {
        console.log('📝 Typing captured audio result...');
        await textInput.click();
        await textInput.type(capturedText.trim(), { delay: 100 });
        
        console.log('⌨️ Submitting audio result...');
        await textInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalContent = await page.content();
        if (!finalContent.toLowerCase().includes('captcha')) {
          console.log('🎉🎉🎉 BRAINSPEAK AUDIO CAPTCHA SOLVED! 🎉🎉🎉');
          return true;
        } else {
          console.log('❌ That sequence didn\'t work - CAPTCHA changed, trying again...');
        }
      }
    } else {
      console.log('❌ No audio captured - silence or capture failed');
    }
    
  } else {
    console.log('❌ No audio button found');
  }
  
  console.log('🧠 Brainspeak audio solver ready for next attempt');
  await new Promise(() => {}); // Keep open
}

async function captureAudioWithBrainspeak() {
  return new Promise((resolve) => {
    console.log('🎧 Starting brainspeak audio capture (15 seconds max)...');
    
    const timestamp = Date.now();
    const tempFile = `/tmp/captcha_audio_${timestamp}.wav`;
    
    // Use brainspeak's proven audio capture approach
    const soxCommand = `timeout 15 sox -t alsa hw:3,0 -r 16000 -c 1 ${tempFile} silence 1 0.1 3% 1 2.5 3%`;
    
    console.log('🔊 Recording CAPTCHA audio...');
    
    exec(soxCommand, (error, stdout, stderr) => {
      if (error && !error.message.includes('timeout')) {
        console.log(`❌ Audio capture error: ${error.message}`);
        resolve(null);
        return;
      }
      
      console.log('🎧 Audio captured - transcribing with Whisper...');
      
      // Use Whisper like brainspeak does
      const whisperCommand = `/home/mike/.local/bin/whisper ${tempFile} --model base --language en --output_format txt --output_dir /tmp`;
      
      exec(whisperCommand, (whisperError, whisperStdout, whisperStderr) => {
        if (whisperError) {
          console.log(`❌ Whisper error: ${whisperError.message}`);
          resolve(null);
          return;
        }
        
        // Read the transcription
        const transcriptionFile = `/tmp/captcha_audio_${timestamp}.txt`;
        
        if (fs.existsSync(transcriptionFile)) {
          const text = fs.readFileSync(transcriptionFile, 'utf8');
          
          // Clean the text like brainspeak does
          const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');
          
          console.log(`🔤 WHISPER TRANSCRIBED: "${cleanText}"`);
          
          // Cleanup
          try {
            fs.unlinkSync(tempFile);
            fs.unlinkSync(transcriptionFile);
          } catch (e) {}
          
          resolve(cleanText);
        } else {
          console.log('❌ No transcription file generated');
          resolve(null);
        }
      });
    });
  });
}

brainspeakAudioSolver().catch(console.error);
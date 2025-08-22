#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function captchaWithBrainspeak() {
  console.log('🎧 CAPTCHA + BRAINSPEAK APPROACH - Using hw:3,0 audio capture!');
  
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
    console.log('🔊 Playing CAPTCHA audio...');
    const audioElements = await frame.$$('audio, button[title*="play"], button[aria-label*="play"], [class*="play"]');
    if (audioElements.length > 0) {
      await audioElements[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎧 CAPTURING CAPTCHA AUDIO with brainspeak approach...');
    
    // Use brainspeak's proven method: hw:3,0 + sox + whisper
    const audioResult = await captureAndTranscribeAudio();
    
    if (audioResult && audioResult.trim()) {
      console.log(`🎉 AUDIO CAPTURED: "${audioResult}"`);
      
      // Type into CAPTCHA input
      const textInput = await frame.$('input[type="text"], input:not([type])');
      if (textInput) {
        console.log('📝 Typing audio result into CAPTCHA...');
        await textInput.click();
        await textInput.type(audioResult.trim(), { delay: 100 });
        
        console.log('⌨️ Submitting CAPTCHA answer...');
        await textInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalContent = await page.content();
        if (!finalContent.toLowerCase().includes('captcha')) {
          console.log('🎉🎉🎉 CAPTCHA SOLVED WITH BRAINSPEAK AUDIO! 🎉🎉🎉');
          return true;
        } else {
          console.log('❌ Wrong answer - CAPTCHA generated new challenge');
        }
      }
    } else {
      console.log('❌ No audio captured');
    }
    
  } else {
    console.log('❌ No audio button found');
  }
  
  console.log('🎧 Ready for next CAPTCHA attempt');
  await new Promise(() => {}); // Keep open
}

async function captureAndTranscribeAudio() {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const audioFile = `/tmp/captcha_${timestamp}.wav`;
    
    console.log('🔊 Detecting available audio devices...');
    
    // Try to detect available audio devices first
    exec('arecord -l', (listError, listStdout, listStderr) => {
      let audioDevice = 'default'; // fallback
      
      if (!listError && listStdout) {
        console.log('Available audio devices:', listStdout);
        
        // Try to find hw:3,0 first (brainspeak default)
        if (listStdout.includes('card 3:')) {
          audioDevice = 'hw:3,0';
        } else if (listStdout.includes('card 2:')) {
          audioDevice = 'hw:2,0';
        } else if (listStdout.includes('card 1:')) {
          audioDevice = 'hw:1,0';
        } else if (listStdout.includes('card 0:')) {
          audioDevice = 'hw:0,0';
        }
      } else {
        console.log('Could not list audio devices, using default');
      }
      
      console.log(`🔊 Using audio device: ${audioDevice}`);
      
      // Use detected device with brainspeak sox parameters
      const soxCmd = `timeout 15 sox -t alsa ${audioDevice} -r 16000 -c 1 ${audioFile} silence 1 0.1 3% 1 2.5 3%`;
      
      exec(soxCmd, (error, stdout, stderr) => {
        if (error && !error.message.includes('timeout')) {
          console.log(`❌ Sox capture failed: ${error.message}`);
          resolve(null);
          return;
        }
        
        console.log('🎧 Audio captured - running Whisper transcription...');
        
        // Same Whisper command as brainspeak (from voice-hotkey.sh line 29)
        const whisperCmd = `/home/mike/.local/bin/whisper ${audioFile} --model base --language en --output_format txt --output_dir /tmp`;
        
        exec(whisperCmd, (whisperError, whisperStdout, whisperStderr) => {
          if (whisperError) {
            console.log(`❌ Whisper failed: ${whisperError.message}`);
            resolve(null);
            return;
          }
          
          const txtFile = `/tmp/captcha_${timestamp}.txt`;
          
          if (fs.existsSync(txtFile)) {
            let text = fs.readFileSync(txtFile, 'utf8');
            
            // Same text cleaning as brainspeak (from voice-hotkey.sh lines 34-35)
            text = text.replace(/\n/g, ' ').replace(/  +/g, ' ').trim();
            
            // Extract only numbers/letters for CAPTCHA
            const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');
            
            console.log(`🔤 RAW WHISPER: "${text}"`);
            console.log(`🔤 CLEAN RESULT: "${cleanText}"`);
            
            // Cleanup files
            try {
              fs.unlinkSync(audioFile);
              fs.unlinkSync(txtFile);
            } catch (e) {}
            
            resolve(cleanText);
          } else {
            console.log('❌ No Whisper output file found');
            resolve(null);
          }
        });
      });
    });
  });
}

captchaWithBrainspeak().catch(console.error);
#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function trueAutomatedAudioSolver() {
  console.log('🤖 TRUE AUTOMATED AUDIO CAPTCHA SOLVER - No human input needed!');
  
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
    
    console.log('🎧 STARTING SYSTEM AUDIO CAPTURE...');
    
    // Start capturing system audio BEFORE playing the CAPTCHA
    const audioResult = await captureSystemAudioDuringPlayback(frame);
    
    if (audioResult && audioResult.trim()) {
      console.log(`🎉 SYSTEM AUDIO CAPTURED AND TRANSCRIBED: "${audioResult}"`);
      
      // Type into CAPTCHA input
      const textInput = await frame.$('input[type="text"], input:not([type])');
      if (textInput) {
        console.log('📝 Typing transcribed result into CAPTCHA...');
        await textInput.click();
        await textInput.type(audioResult.trim(), { delay: 100 });
        
        console.log('⌨️ Submitting CAPTCHA answer...');
        await textInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalContent = await page.content();
        if (!finalContent.toLowerCase().includes('captcha')) {
          console.log('🎉🎉🎉 TRUE AUTOMATED AUDIO CAPTCHA SOLVED! 🎉🎉🎉');
          return true;
        } else {
          console.log('❌ Wrong answer - trying again with new CAPTCHA');
        }
      }
    } else {
      console.log('❌ No system audio captured or transcribed');
    }
    
  } else {
    console.log('❌ No audio button found');
  }
  
  console.log('🤖 True automated solver ready for next attempt');
  await new Promise(() => {}); // Keep open
}

async function captureSystemAudioDuringPlayback(frame) {
  return new Promise(async (resolve) => {
    const timestamp = Date.now();
    const audioFile = `/tmp/system_captcha_${timestamp}.wav`;
    
    console.log('🔊 Starting system audio capture with FFmpeg...');
    
    // Start FFmpeg capture of system audio in background
    const ffmpegProcess = exec(`ffmpeg -f pulse -i default -t 15 -ar 16000 -ac 1 ${audioFile} -y`, (error) => {
      if (error && !error.message.includes('timeout')) {
        console.log(`❌ FFmpeg capture error: ${error.message}`);
      }
    });
    
    // Wait a moment for FFmpeg to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now play the CAPTCHA audio while FFmpeg is recording
    console.log('🔊 Playing CAPTCHA audio while recording system output...');
    const audioElements = await frame.$$('audio, button[title*="play"], button[aria-label*="play"], [class*="play"]');
    if (audioElements.length > 0) {
      await audioElements[0].click();
    }
    
    // Wait for CAPTCHA to play completely
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Stop FFmpeg
    ffmpegProcess.kill('SIGTERM');
    
    // Wait for file to be written
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (fs.existsSync(audioFile)) {
      const stats = fs.statSync(audioFile);
      console.log(`📊 Captured ${stats.size} bytes of system audio`);
      
      if (stats.size > 10000) {
        console.log('🎧 Transcribing captured system audio with Whisper...');
        
        const whisperCmd = `/home/mike/.local/bin/whisper ${audioFile} --model base --language en --output_format txt --output_dir /tmp`;
        
        exec(whisperCmd, (whisperError, whisperStdout, whisperStderr) => {
          if (whisperError) {
            console.log(`❌ Whisper failed: ${whisperError.message}`);
            resolve(null);
            return;
          }
          
          const txtFile = `/tmp/system_captcha_${timestamp}.txt`;
          
          if (fs.existsSync(txtFile)) {
            let text = fs.readFileSync(txtFile, 'utf8');
            
            // Clean text for CAPTCHA input
            text = text.replace(/\n/g, ' ').replace(/  +/g, ' ').trim();
            const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');
            
            console.log(`🔤 RAW TRANSCRIPTION: "${text}"`);
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
      } else {
        console.log('❌ Audio file too small - no system audio captured');
        resolve(null);
      }
    } else {
      console.log('❌ No system audio file created');
      resolve(null);
    }
  });
}

trueAutomatedAudioSolver().catch(console.error);
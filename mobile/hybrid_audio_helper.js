#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');
const fs = require('fs');

puppeteer.use(StealthPlugin());

async function hybridAudioHelper() {
  console.log('🤝 HYBRID AUDIO HELPER - I capture, you verify and enter');
  
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
    
    console.log('🎧 CAPTURING SYSTEM AUDIO...');
    
    // Capture and transcribe
    const transcribedNumbers = await captureAndTranscribeSystemAudio(frame);
    
    if (transcribedNumbers && transcribedNumbers.trim()) {
      console.log('\n🎯 === VERIFICATION NEEDED ===');
      console.log(`🤖 I heard: "${transcribedNumbers}"`);
      console.log('👂 Did you hear the same numbers?');
      console.log('✅ If correct: Enter them manually in the CAPTCHA');
      console.log('❌ If wrong: Try clicking the audio button again');
      console.log('=====================================\n');
      
      // Keep browser open for manual entry
      console.log('🔄 Browser staying open for you to verify and enter...');
      console.log('💡 Close browser when done');
      
    } else {
      console.log('❌ Could not transcribe audio - try playing it again');
    }
    
  } else {
    console.log('❌ No audio button found');
  }
  
  // Keep browser open indefinitely for manual verification
  await new Promise(() => {});
}

async function captureAndTranscribeSystemAudio(frame) {
  return new Promise(async (resolve) => {
    const timestamp = Date.now();
    const audioFile = `/tmp/captcha_helper_${timestamp}.wav`;
    
    console.log('🔊 Starting FFmpeg system audio capture...');
    
    // Start FFmpeg capture
    const ffmpegProcess = exec(`ffmpeg -f pulse -i default -t 15 -ar 16000 -ac 1 ${audioFile} -y -loglevel quiet`, (error) => {
      if (error && !error.message.includes('timeout')) {
        console.log(`❌ Audio capture failed: ${error.message}`);
      }
    });
    
    // Wait for FFmpeg to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Play the CAPTCHA audio
    console.log('▶️ Playing CAPTCHA audio while recording...');
    const audioElements = await frame.$$('audio, button[title*="play"], button[aria-label*="play"], [class*="play"]');
    if (audioElements.length > 0) {
      await audioElements[0].click();
    }
    
    // Let it play
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Stop recording
    ffmpegProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (fs.existsSync(audioFile)) {
      const stats = fs.statSync(audioFile);
      console.log(`📊 Captured ${stats.size} bytes`);
      
      if (stats.size > 10000) {
        console.log('🎧 Transcribing with Whisper...');
        
        const whisperCmd = `/home/mike/.local/bin/whisper ${audioFile} --model base --language en --output_format txt --output_dir /tmp --verbose False`;
        
        exec(whisperCmd, (whisperError, whisperStdout, whisperStderr) => {
          const txtFile = `/tmp/captcha_helper_${timestamp}.txt`;
          
          if (fs.existsSync(txtFile)) {
            let text = fs.readFileSync(txtFile, 'utf8').trim();
            
            // Clean for numbers only
            const numbersOnly = text.replace(/[^0-9]/g, '');
            
            console.log(`📝 Raw: "${text}"`);
            console.log(`🔢 Numbers: "${numbersOnly}"`);
            
            // Cleanup
            try {
              fs.unlinkSync(audioFile);
              fs.unlinkSync(txtFile);
            } catch (e) {}
            
            resolve(numbersOnly || text);
          } else {
            console.log('❌ No transcription file');
            resolve(null);
          }
        });
      } else {
        console.log('❌ No audio captured');
        resolve(null);
      }
    } else {
      console.log('❌ No audio file created');
      resolve(null);
    }
  });
}

hybridAudioHelper().catch(console.error);
#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

console.log('🎤 SPEECH CAPTURE TEST - Using working hw:2,0 device');

async function testSpeechCapture() {
  
  console.log('\n🔊 READY TO CAPTURE SPEECH!');
  console.log('📢 SAY SOME NUMBERS when recording starts...');
  console.log('   Example: "One two three four five"');
  console.log('   Or: "127241" (like CAPTCHA numbers)');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n🎬 RECORDING NOW! Say something...');
  
  // Use the working hw:2,0 device with brainspeak silence detection
  const timestamp = Date.now();
  const audioFile = `/tmp/speech_test_${timestamp}.wav`;
  
  await captureWithSpeech(audioFile);
  
  if (fs.existsSync(audioFile)) {
    const stats = fs.statSync(audioFile);
    console.log(`\n📊 Captured: ${stats.size} bytes`);
    
    if (stats.size > 1000) {
      console.log('\n🎧 Transcribing with Whisper...');
      await transcribeAudio(audioFile, timestamp);
    } else {
      console.log('❌ Audio file too small - no speech detected');
    }
  } else {
    console.log('❌ No audio file created');
  }
}

function captureWithSpeech(audioFile) {
  return new Promise((resolve) => {
    // Working command: hw:2,0 + silence detection
    const command = `timeout 15 sox -t alsa hw:2,0 -r 16000 -c 1 ${audioFile} silence 1 0.1 3% 1 2.5 3%`;
    
    console.log('🔴 RECORDING... (will stop after 2.5 seconds of silence or 15 seconds total)');
    
    exec(command, (error, stdout, stderr) => {
      if (error && !error.message.includes('timeout')) {
        console.log(`❌ Recording failed: ${error.message}`);
      } else {
        console.log('⏹️ Recording stopped');
      }
      resolve();
    });
  });
}

function transcribeAudio(audioFile, timestamp) {
  return new Promise((resolve) => {
    const command = `/home/mike/.local/bin/whisper ${audioFile} --model base --language en --output_format txt --output_dir /tmp`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`❌ Whisper failed: ${error.message}`);
      } else {
        console.log('✅ Whisper transcription complete');
        
        const txtFile = `/tmp/speech_test_${timestamp}.txt`;
        if (fs.existsSync(txtFile)) {
          const text = fs.readFileSync(txtFile, 'utf8').trim();
          
          console.log(`\n🎯 TRANSCRIBED TEXT: "${text}"`);
          
          // Extract numbers like CAPTCHA would need
          const numbersOnly = text.replace(/[^0-9]/g, '');
          console.log(`🔢 NUMBERS ONLY: "${numbersOnly}"`);
          
          // Clean text like brainspeak does
          const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');
          console.log(`🧹 CLEAN TEXT: "${cleanText}"`);
          
        } else {
          console.log('❌ No transcription file found');
        }
      }
      resolve();
    });
  });
}

console.log('Starting speech capture test in 1 second...');
setTimeout(() => {
  testSpeechCapture().catch(console.error);
}, 1000);
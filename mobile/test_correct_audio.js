#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

console.log('🎯 TESTING CORRECT AUDIO DEVICES - Based on failure analysis');

async function testWorkingAudio() {
  
  console.log('\n🔍 From arecord -l we found:');
  console.log('   📡 card 2: CameraB409241 [USB Camera-B4.09.24.1], device 0');
  console.log('   📡 card 3: G [CORSAIR VIRTUOSO MAX]');
  
  console.log('\n1️⃣ TEST: hw:2,0 (USB Camera audio)');
  await testAudioCapture('timeout 5 sox -t alsa hw:2,0 -r 16000 -c 1 /tmp/test_hw2.wav', 'hw:2,0');
  
  console.log('\n2️⃣ TEST: hw:3,0 (CORSAIR headset - brainspeak default)');
  await testAudioCapture('timeout 5 sox -t alsa hw:3,0 -r 16000 -c 1 /tmp/test_hw3.wav', 'hw:3,0');
  
  console.log('\n3️⃣ TEST: Default device with format conversion');
  await testAudioCapture('timeout 5 sox -t alsa default -r 16000 -c 1 /tmp/test_default_converted.wav', 'default converted');
  
  console.log('\n4️⃣ TEST: PulseAudio source');
  await testAudioCapture('timeout 5 sox -t pulseaudio default -r 16000 -c 1 /tmp/test_pulse.wav', 'pulseaudio');
  
  console.log('\n5️⃣ CHECK: Which files were actually created?');
  await checkCreatedFiles();
  
  console.log('\n6️⃣ TEST: Whisper on any successful recording');
  await testWhisperOnFiles();
}

function testAudioCapture(command, description) {
  return new Promise((resolve) => {
    console.log(`\n   Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ FAILED: ${description}`);
        console.log(`   📝 Error: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ SUCCESS: ${description}`);
        console.log(`   📝 Recording completed without errors`);
      }
      resolve();
    });
  });
}

async function checkCreatedFiles() {
  const testFiles = [
    '/tmp/test_hw2.wav',
    '/tmp/test_hw3.wav', 
    '/tmp/test_default_converted.wav',
    '/tmp/test_pulse.wav'
  ];
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`   ✅ ${file}: ${stats.size} bytes`);
    } else {
      console.log(`   ❌ ${file}: Not created`);
    }
  }
}

async function testWhisperOnFiles() {
  const testFiles = [
    '/tmp/test_hw2.wav',
    '/tmp/test_hw3.wav', 
    '/tmp/test_default_converted.wav',
    '/tmp/test_pulse.wav'
  ];
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.size > 1000) { // Only test files with actual content
        console.log(`\n   🎧 Testing Whisper on ${file}...`);
        await testWhisper(file);
        break; // Only test the first working file
      }
    }
  }
}

function testWhisper(audioFile) {
  return new Promise((resolve) => {
    const command = `/home/mike/.local/bin/whisper ${audioFile} --model tiny --language en --output_format txt --output_dir /tmp`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ Whisper failed: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ Whisper success`);
        
        // Check for output file
        const txtFile = audioFile.replace('.wav', '.txt');
        if (fs.existsSync(txtFile)) {
          const text = fs.readFileSync(txtFile, 'utf8');
          console.log(`   📝 Transcribed: "${text.substring(0, 50)}"`);
        }
      }
      resolve();
    });
  });
}

testWorkingAudio().catch(console.error);
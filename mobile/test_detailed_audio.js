#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

console.log('🔬 DETAILED AUDIO TESTING - Understanding what works');

async function detailedAudioTest() {
  
  console.log('\n1️⃣ SUCCESS ANALYSIS: hw:2,0 created 77,868 bytes');
  await analyzeFile('/tmp/test_hw2.wav');
  
  console.log('\n2️⃣ TEST: Longer recording on hw:2,0 (the working device)');
  await testLongerRecording();
  
  console.log('\n3️⃣ TEST: hw:2,0 with silence detection (brainspeak style)');
  await testWithSilenceDetection();
  
  console.log('\n4️⃣ TEST: Different sox parameters for hw:3,0');
  await debugHW3();
  
  console.log('\n5️⃣ TEST: Check what audio is actually being captured');
  await testPlayback();
  
  console.log('\n6️⃣ WHISPER TEST: With longer audio');
  await testWhisperWithBetterAudio();
}

function analyzeFile(filepath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filepath)) {
      console.log(`   ❌ File ${filepath} doesn't exist`);
      resolve();
      return;
    }
    
    const command = `soxi ${filepath}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ Can't analyze: ${error.message}`);
      } else {
        console.log(`   📊 File info:\n${stdout}`);
      }
      resolve();
    });
  });
}

function testLongerRecording() {
  return new Promise((resolve) => {
    const command = 'timeout 10 sox -t alsa hw:2,0 -r 16000 -c 1 /tmp/test_hw2_long.wav';
    console.log(`   Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ Failed: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ Success: 10-second recording`);
        
        if (fs.existsSync('/tmp/test_hw2_long.wav')) {
          const stats = fs.statSync('/tmp/test_hw2_long.wav');
          console.log(`   📊 Size: ${stats.size} bytes`);
        }
      }
      resolve();
    });
  });
}

function testWithSilenceDetection() {
  return new Promise((resolve) => {
    // Exact brainspeak command but with hw:2,0 instead of hw:3,0
    const command = 'timeout 15 sox -t alsa hw:2,0 -r 16000 -c 1 /tmp/test_hw2_silence.wav silence 1 0.1 3% 1 2.5 3%';
    console.log(`   Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error && !error.message.includes('timeout')) {
        console.log(`   ❌ Failed: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ Success: Brainspeak-style recording with silence detection`);
        
        if (fs.existsSync('/tmp/test_hw2_silence.wav')) {
          const stats = fs.statSync('/tmp/test_hw2_silence.wav');
          console.log(`   📊 Size: ${stats.size} bytes`);
        }
      }
      resolve();
    });
  });
}

function debugHW3() {
  return new Promise((resolve) => {
    console.log(`   🔍 Checking hw:3,0 capabilities...`);
    
    const command = 'arecord -D hw:3,0 --dump-hw-params';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ hw:3,0 debug failed: ${error.message.substring(0, 150)}`);
        console.log(`   📝 This explains why brainspeak hw:3,0 isn't working here`);
      } else {
        console.log(`   ✅ hw:3,0 parameters:\n${stdout.substring(0, 200)}`);
      }
      resolve();
    });
  });
}

function testPlayback() {
  return new Promise((resolve) => {
    console.log(`   🔊 Testing if we can hear what was recorded...`);
    
    if (fs.existsSync('/tmp/test_hw2.wav')) {
      const command = 'timeout 3 play /tmp/test_hw2.wav';
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`   ❌ Can't play back: ${error.message.substring(0, 100)}`);
        } else {
          console.log(`   ✅ Playback worked - audio was captured successfully`);
        }
        resolve();
      });
    } else {
      console.log(`   ❌ No audio file to test playback`);
      resolve();
    }
  });
}

function testWhisperWithBetterAudio() {
  return new Promise((resolve) => {
    // Test with the longer recording if it exists
    const testFile = fs.existsSync('/tmp/test_hw2_silence.wav') ? '/tmp/test_hw2_silence.wav' : '/tmp/test_hw2_long.wav';
    
    if (!fs.existsSync(testFile)) {
      console.log(`   ❌ No good audio file for Whisper test`);
      resolve();
      return;
    }
    
    console.log(`   🎧 Testing Whisper on ${testFile}...`);
    const command = `/home/mike/.local/bin/whisper ${testFile} --model tiny --language en --output_format txt --output_dir /tmp`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ Whisper failed: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ Whisper completed`);
        
        const txtFile = testFile.replace('.wav', '.txt');
        if (fs.existsSync(txtFile)) {
          const text = fs.readFileSync(txtFile, 'utf8').trim();
          console.log(`   📝 Transcribed: "${text || '(empty/silence)'}"`);
        }
      }
      resolve();
    });
  });
}

detailedAudioTest().catch(console.error);
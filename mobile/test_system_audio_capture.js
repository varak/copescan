#!/usr/bin/env node

const { exec } = require('child_process');

console.log('🔊 TESTING SYSTEM AUDIO OUTPUT CAPTURE - The missing piece!');

async function testSystemAudioCapture() {
  
  console.log('\n🎯 PROBLEM: We were capturing MICROPHONE input, but CAPTCHA plays through SPEAKERS');
  console.log('💡 SOLUTION: Capture system audio OUTPUT instead');
  
  console.log('\n1️⃣ CHECK: Available PulseAudio sources (including monitor devices)');
  await testCommand('pactl list sources short', 'List audio sources');
  
  console.log('\n2️⃣ TEST: Capture from default monitor (speaker output)');
  await testAudioCapture('timeout 5 sox -t pulseaudio default.monitor -r 16000 -c 1 /tmp/test_monitor.wav', 'Monitor default speakers');
  
  console.log('\n3️⃣ TEST: Alternative monitor capture methods');
  await testAudioCapture('timeout 5 sox -t pulseaudio alsa_output.pci-0000_00_1f.3.analog-stereo.monitor -r 16000 -c 1 /tmp/test_alsa_monitor.wav', 'ALSA monitor');
  
  console.log('\n4️⃣ TEST: FFMPEG system audio capture');
  await testAudioCapture('timeout 5 ffmpeg -f pulse -i default -t 5 -ar 16000 -ac 1 /tmp/test_ffmpeg.wav', 'FFmpeg pulse audio');
  
  console.log('\n5️⃣ CHECK: Which method worked?');
  await checkResults();
}

function testCommand(command, description) {
  return new Promise((resolve) => {
    console.log(`\n   Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ FAILED: ${description}`);
        console.log(`   📝 Error: ${error.message.substring(0, 100)}`);
      } else {
        console.log(`   ✅ SUCCESS: ${description}`);
        if (stdout) {
          console.log(`   📝 Output: ${stdout.substring(0, 300)}`);
        }
      }
      resolve();
    });
  });
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
        console.log(`   📝 System audio captured successfully`);
      }
      resolve();
    });
  });
}

async function checkResults() {
  const testFiles = [
    '/tmp/test_monitor.wav',
    '/tmp/test_alsa_monitor.wav', 
    '/tmp/test_ffmpeg.wav'
  ];
  
  const fs = require('fs');
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`   ✅ ${file}: ${stats.size} bytes`);
      
      if (stats.size > 10000) {
        console.log(`   🎯 ${file} has substantial content - good candidate for CAPTCHA audio capture`);
      }
    } else {
      console.log(`   ❌ ${file}: Not created`);
    }
  }
}

testSystemAudioCapture().catch(console.error);
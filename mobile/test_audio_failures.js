#!/usr/bin/env node

const { exec } = require('child_process');

console.log('🎧 TESTING AUDIO CAPTURE FAILURES - Learning how things break');

async function testKnownFailures() {
  
  console.log('\n1️⃣ TEST: Sox with no device specified (should fail)');
  await testSoxCommand('sox -r 16000 -c 1 /tmp/test_fail_1.wav', 'No device');
  
  console.log('\n2️⃣ TEST: Sox with fake device hw:99,0 (should fail)');
  await testSoxCommand('sox -t alsa hw:99,0 -r 16000 -c 1 /tmp/test_fail_2.wav', 'Fake device');
  
  console.log('\n3️⃣ TEST: Sox with wrong format (should fail)');
  await testSoxCommand('sox -t alsa hw:0,0 -r 999999 -c 99 /tmp/test_fail_3.wav', 'Wrong format');
  
  console.log('\n4️⃣ TEST: List available audio devices');
  await testCommand('arecord -l', 'List audio devices');
  
  console.log('\n5️⃣ TEST: Sox with default device (might work)');
  await testSoxCommand('timeout 3 sox -t alsa default -r 16000 -c 1 /tmp/test_basic.wav', 'Default device');
  
  console.log('\n6️⃣ TEST: Sox with hw:0,0 (might work)');
  await testSoxCommand('timeout 3 sox -t alsa hw:0,0 -r 16000 -c 1 /tmp/test_hw0.wav', 'Hardware device 0');
  
  console.log('\n7️⃣ TEST: Check if Whisper exists');
  await testCommand('/home/mike/.local/bin/whisper --help', 'Whisper availability');
  
  console.log('\n8️⃣ TEST: Check pulse audio');
  await testCommand('pactl info', 'PulseAudio info');
  
  console.log('\n🎯 FAILURE ANALYSIS COMPLETE');
}

function testSoxCommand(command, description) {
  return new Promise((resolve) => {
    console.log(`\n   Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ FAILED (expected): ${description}`);
        console.log(`   📝 Error: ${error.message}`);
        if (stderr) console.log(`   📝 Stderr: ${stderr}`);
      } else {
        console.log(`   ✅ WORKED: ${description}`);
        console.log(`   📝 Success: Command completed`);
        if (stdout) console.log(`   📝 Output: ${stdout}`);
      }
      resolve();
    });
  });
}

function testCommand(command, description) {
  return new Promise((resolve) => {
    console.log(`\n   Command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`   ❌ FAILED: ${description}`);
        console.log(`   📝 Error: ${error.message}`);
      } else {
        console.log(`   ✅ SUCCESS: ${description}`);
        if (stdout) {
          const output = stdout.substring(0, 200);
          console.log(`   📝 Output: ${output}${stdout.length > 200 ? '...' : ''}`);
        }
      }
      resolve();
    });
  });
}

testKnownFailures().catch(console.error);
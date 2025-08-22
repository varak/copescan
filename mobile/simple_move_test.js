#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function testSimpleMovement() {
  console.log('🧪 Testing SIMPLE slider movement...');
  
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
  
  const content = await page.content();
  if (!content.toLowerCase().includes('captcha')) {
    console.log('❌ No CAPTCHA found');
    return;
  }
  
  console.log('✅ CAPTCHA found, looking for slider...');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Just try to find and click the slider area
  try {
    // Take screenshot before
    await page.screenshot({ path: 'before_click.png' });
    
    // Click somewhere in the middle of the screen where slider usually is
    console.log('🖱️ Clicking in slider area...');
    await page.mouse.click(200, 400);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Take screenshot after
    await page.screenshot({ path: 'after_click.png' });
    
    console.log('📸 Screenshots taken - check before_click.png and after_click.png');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('🏁 Simple test complete');
  
  // Keep browser open
  await new Promise(() => {});
}

testSimpleMovement().catch(console.error);
#!/usr/bin/env node

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function justMoveIt() {
  console.log('🎯 JUST MOVE THE DAMN THING!');
  
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
  
  const iframes = await page.$$('iframe');
  const frame = await iframes[0].contentFrame();
  const iframeBox = await iframes[0].boundingBox();
  
  const slider = await frame.$('[class*="slider"]:not([class*="track"])');
  const sliderBox = await slider.boundingBox();
  
  const startX = iframeBox.x + sliderBox.x + sliderBox.width / 2;
  const startY = iframeBox.y + sliderBox.y + sliderBox.height / 2;
  
  console.log(`🎯 Slider at: ${startX}, ${startY}`);
  
  // Just try to move 100px and see if it moves
  console.log('🖱️ Moving to slider...');
  await page.mouse.move(startX, startY, { steps: 10 });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('🖱️ Clicking down...');
  await page.mouse.down();
  await new Promise(resolve => setTimeout(resolve, 200));
  
  console.log('🖱️ Dragging 100px...');
  
  for (let i = 0; i <= 50; i++) {
    const progress = i / 50;
    const currentX = startX + (100 * progress);
    const currentY = startY + Math.sin(progress * Math.PI) * 2;
    
    await page.mouse.move(currentX, currentY);
    await new Promise(resolve => setTimeout(resolve, 30));
    
    if (i % 10 === 0) {
      const moved = currentX - startX;
      console.log(`🖱️ MOVING: ${Math.round(moved)}px`);
    }
  }
  
  console.log('🖱️ Releasing...');
  await page.mouse.up();
  
  console.log('🎯 DONE - Did you see it move?');
  
  await new Promise(() => {}); // Keep open
}

justMoveIt().catch(console.error);
// Test Copenhagen code pattern recognition
const testCodes = [
  'CABCD-1234-5678',
  'C1234-ABCD-9876', 
  'CFAKE-TEST-CODE',
  'CABCD1234-5678', // missing dash
  'ABCD-1234-5678', // doesn't start with C
  'C12-1234-5678'   // too short first part
];

const copePattern = /C[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
const fallbackPattern = /[A-Z0-9]{4,5}-[A-Z0-9]{4}-[A-Z0-9]{4}/gi;

console.log('Testing Copenhagen code patterns:');
console.log('=================================');

testCodes.forEach(code => {
  const primaryMatch = code.match(copePattern);
  const fallbackMatch = code.match(fallbackPattern);
  
  console.log(`Code: ${code}`);
  console.log(`  Primary match (C****-****-****): ${primaryMatch ? primaryMatch[0] : 'NO MATCH'}`);
  console.log(`  Fallback match (****-****-****): ${fallbackMatch ? fallbackMatch[0] : 'NO MATCH'}`);
  console.log('');
});

// Test with spaces and noise
const noisyText = 'Some text CABCD-1234-5678 more text';
console.log('Testing with noisy text:', noisyText);
const cleanText = noisyText.replace(/\s/g, '');
console.log('Cleaned text:', cleanText);
const match = cleanText.match(copePattern);
console.log('Match:', match ? match[0] : 'NO MATCH');
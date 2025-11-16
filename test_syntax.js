// Simple syntax validation test
const fs = require('fs');

// Read the Google Apps Script file
const content = fs.readFileSync('backend/PrenotazioniService.gs', 'utf8');

// Basic syntax checks
console.log('File length:', content.length);
console.log('Line count:', content.split('\n').length);

// Check for basic structural issues
const lines = content.split('\n');
let braceCount = 0;
let inTryBlock = false;
let catchWithoutTry = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count braces
  braceCount += (line.match(/\{/g) || []).length;
  braceCount -= (line.match(/\}/g) || []).length;
  
  // Check try-catch structure
  if (line.includes('try {')) {
    inTryBlock = true;
  }
  if (line.includes('} catch') && !inTryBlock) {
    catchWithoutTry++;
    console.log(`Line ${i + 1}: catch without try - ${line.trim()}`);
  }
  if (line.includes('} catch') && inTryBlock) {
    inTryBlock = false;
  }
}

console.log('Brace balance:', braceCount);
console.log('Catch without try blocks:', catchWithoutTry);

if (catchWithoutTry === 0 && braceCount === 0) {
  console.log('✅ Basic syntax validation PASSED');
} else {
  console.log('❌ Basic syntax validation FAILED');
}
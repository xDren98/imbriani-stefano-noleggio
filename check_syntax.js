// Simple syntax check
import { readFileSync } from 'fs';

const content = readFileSync('backend/PrenotazioniService.gs', 'utf8');
const lines = content.split('\n');

console.log('Checking for syntax issues...');

// Check for orphaned closing parentheses
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line === ');') {
    console.log(`Line ${i + 1}: Orphaned closing parenthesis - "${lines[i]}"`);
    console.log(`Context: ${lines[i-1] || ''}`);
    console.log(`         ${lines[i]}`);
    console.log(`         ${lines[i+1] || ''}`);
  }
}

console.log('Check complete.');
import fs from 'fs'

const content = fs.readFileSync('backend/PrenotazioniService.gs', 'utf8')
const lines = content.split('\n')

let count = 0
const stack = []
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  for (const ch of line) {
    if (ch === '{') { count++; stack.push(i + 1) }
    else if (ch === '}') { count--; stack.pop() }
  }
}

console.log('Brace count:', count)
if (count !== 0) {
  console.log('Unmatched "{" positions (top 5):')
  const top = stack.slice(-5)
  for (const pos of top) console.log('Line', pos)
}

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const src = fs.readFileSync('shared-utils.js', 'utf8')

function extract(name) {
  const sig = `function ${name}(`
  const i = src.indexOf(sig)
  if (i === -1) throw new Error(`Funzione ${name} non trovata`)
  let j = src.indexOf('{', i)
  let depth = 0
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') {
      depth--
      if (depth === 0) { j++; break }
    }
  }
  const fnStr = src.slice(i, j)
  // eslint-disable-next-line no-new-func
  return Function(`return (${fnStr})`)()
}

const parseDateAny = extract('parseDateAny')

describe('shared-utils parseDateAny', () => {
  it('parsa formati italiani dd/mm/yyyy', () => {
    const d = parseDateAny('12/11/2025')
    expect(d).instanceOf(Date)
    expect(d.getFullYear()).toBe(2025)
  })

  it('parsa ISO yyyy-mm-dd', () => {
    const d = parseDateAny('2025-11-12')
    expect(d.getMonth()).toBe(10)
  })
})

import { spawnSync } from 'node:child_process'

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' })
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || '').trim())
  return (r.stdout || '').trim()
}

const depId = process.env.GAS_DEPLOYMENT_ID || ''
const desc = process.env.GAS_VERSION_DESC || `auto-${new Date().toISOString()}`
if (!depId) {
  console.log('GAS_DEPLOYMENT_ID mancante: deploy GAS saltato')
  process.exit(0)
}
run('npx', ['clasp', 'version', '--description', desc])
const vlist = run('npx', ['clasp', 'versions'])
let ver = null
vlist.split('\n').forEach(line => {
  const m = line.match(/^(\s*|)(\d+)\s+/)
  if (m) ver = parseInt(m[2], 10)
})
if (!ver || isNaN(ver)) throw new Error('Impossibile determinare la versione GAS')
run('npx', ['clasp', 'deploy', '-i', depId, '-V', String(ver)])
console.log(`Deploy GAS aggiornato alla versione ${ver}`)

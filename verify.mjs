/**
 * 오프라인 자체검증 (폐쇄망 Windows PC에서 실행)
 * ---------------------------------------------------------------
 * 네트워크 0으로 다음을 확인한다:
 *   MCP 서버 기동 → 24 툴 노출 → 로컬 페이지 navigate → type(키인) → click → 결과추출
 * 브라우저는 node_modules 안의 크로미움을 쓴다 (PLAYWRIGHT_BROWSERS_PATH=0).
 *
 * 실행:  set PLAYWRIGHT_BROWSERS_PATH=0 && node verify-offline.mjs
 *        (run-closed-win.bat 이 알아서 env 를 설정해 호출한다)
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SHOP = path.resolve(__dirname, 'page-agent-shop.html')
const SHOP_URL = 'file://' + SHOP
const MCP_CLI = path.resolve(__dirname, 'node_modules/@playwright/mcp/cli.js')

function fail(msg) {
  console.error('❌ ' + msg)
  process.exit(1)
}
if (!fs.existsSync(MCP_CLI)) fail('node_modules/@playwright/mcp 가 없습니다. 번들이 온전한지 확인하세요.')
if (!fs.existsSync(SHOP)) fail('page-agent-shop.html 이 없습니다.')

const server = spawn('node', [MCP_CLI, '--headless', '--isolated', '--allow-unrestricted-file-access'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
})
server.stderr.on('data', (d) => process.stderr.write('[mcp] ' + d))

let nextId = 1
const pending = new Map()
let buf = ''
server.stdout.on('data', (chunk) => {
  buf += chunk.toString()
  let nl
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim()
    buf = buf.slice(nl + 1)
    if (!line) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    }
  }
})
function send(method, params) {
  const id = nextId++
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => pending.has(id) && reject(new Error('timeout: ' + method)), 60000)
  })
}
const notify = (m, p) => server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: m, params: p }) + '\n')
const textOf = (r) => (r?.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n')
const call = (name, args) => send('tools/call', { name, arguments: args })
function findRef(snap, role, nameIncludes) {
  for (const line of snap.split('\n')) {
    if (!line.includes(role + ' ')) continue
    if (nameIncludes && !line.toLowerCase().includes(nameIncludes.toLowerCase())) continue
    const m = line.match(/\[ref=([^\]]+)\]/)
    if (m) return m[1]
  }
  return null
}

async function main() {
  const init = await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify-offline', version: '1' },
  })
  console.log('✅ MCP 기동 —', init.serverInfo?.name, init.serverInfo?.version)
  notify('notifications/initialized', {})

  const tools = await send('tools/list', {})
  console.log('✅ 툴 노출 —', tools.tools.length, '개')

  await call('browser_navigate', { url: SHOP_URL })
  console.log('✅ navigate — 로컬 페이지 열림 (네트워크 0, node_modules 크로미움)')

  let snap = textOf(await call('browser_snapshot', {}))
  const box = findRef(snap, 'textbox')
  const btn = findRef(snap, 'button', '검색')
  if (!box || !btn) fail('검색창/버튼 요소를 못 찾음')
  await call('browser_type', { element: '검색창', ref: box, text: '나이키' })
  await call('browser_click', { element: '검색 버튼', ref: btn })
  console.log('✅ type + click — 키인/클릭 동작')

  snap = textOf(await call('browser_snapshot', {}))
  const hits = snap.split('\n').filter((l) => /나이키/.test(l) && /generic|button/.test(l)).length
  if (hits === 0) fail('검색 결과를 못 읽음')
  console.log('✅ 결과추출 — "나이키" 매칭', hits, '건')

  console.log('\n🎉 오프라인 검증 통과. 이제 이 폴더에서  claude  실행 후 playwright MCP approve 하면 끝.')
}

main()
  .then(() => {
    server.kill()
    process.exit(0)
  })
  .catch((e) => {
    console.error('❌ 실패:', e.message)
    server.kill()
    process.exit(1)
  })

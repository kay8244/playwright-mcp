/**
 * 전역(user-scope) MCP 등록 — `~/.claude.json` 최상위 `mcpServers` 에 playwright 추가.
 * ---------------------------------------------------------------
 * 손으로 거대한 JSON을 편집하다 깨지는 걸 방지한다:
 *   파일 읽기 → JSON.parse → 항목 추가 → JSON.stringify 로 다시 저장 (valid 보장).
 * 경로도 이 폴더의 cli.js 절대경로를 자동으로 넣으므로 손댈 게 없다.
 *
 * 사용:
 *   node install-global.mjs            (= npm run install-global)  등록
 *   node install-global.mjs --remove   전역 등록 해제
 *
 * 등록 후: 이 폴더 말고 "딴 폴더"에서  claude → /mcp → playwright connected 확인.
 *   (이 폴더 안에서 켜면 자체 .mcp.json 과 중복돼 failed 날 수 있음)
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.resolve(__dirname, 'node_modules/@playwright/mcp/cli.js')
const CONFIG = process.env.CLAUDE_CONFIG || path.join(os.homedir(), '.claude.json')
const REMOVE = process.argv.includes('--remove')

if (!REMOVE && !fs.existsSync(CLI)) {
  console.error('❌ node_modules/@playwright/mcp/cli.js 가 없습니다 — 먼저 `npm run setup` 을 실행하세요.')
  process.exit(1)
}

// 기존 설정 읽기 (없으면 빈 객체). 깨진 JSON이면 멈춘다.
let cfg = {}
if (fs.existsSync(CONFIG)) {
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'))
  } catch {
    console.error(`❌ ${CONFIG} 이 유효한 JSON이 아닙니다.`)
    console.error('   에디터에서 Ctrl+Z 등으로 되돌려 valid 상태로 만든 뒤 다시 실행하세요.')
    process.exit(1)
  }
}

cfg.mcpServers = cfg.mcpServers || {} // ★ 최상위(top-level) mcpServers = 전역

if (REMOVE) {
  delete cfg.mcpServers.playwright
  console.log('🗑  전역 등록 해제 — mcpServers.playwright 제거')
} else {
  // 브라우저를 node_modules 안에서 찾게 하고(0), WSL 등 GUI 있으면 DISPLAY 를 넘겨
  // 브라우저 창이 실제로 화면에 뜨게 한다(headed). DISPLAY 없으면(헤드리스 서버) 생략.
  const env = { PLAYWRIGHT_BROWSERS_PATH: '0' }
  if (process.env.DISPLAY) env.DISPLAY = process.env.DISPLAY
  cfg.mcpServers.playwright = {
    command: 'node',
    args: [CLI, '--isolated', '--allow-unrestricted-file-access'],
    env,
  }
  console.log('✅ 전역 등록 완료 — ~/.claude.json 최상위 mcpServers.playwright')
  console.log('   cli:', CLI)
  console.log('   DISPLAY:', process.env.DISPLAY ? `${process.env.DISPLAY} (브라우저 창 보임/headed)` : '(없음 → 헤드리스)')
}

fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2))
console.log(`   파일: ${CONFIG}`)
if (!REMOVE) {
  console.log('\n다음 → 이 폴더 말고 "딴 폴더"에서:  claude  → /mcp → playwright 가 connected 면 성공.')
  console.log('(이 폴더 안에서 켜면 자체 .mcp.json 과 중복돼 failed 날 수 있음)')
}

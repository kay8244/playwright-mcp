/**
 * 원커맨드 부트스트랩 (온라인 개발자용)
 * ---------------------------------------------------------------
 * 어느 OS/쉘에서도 동일하게:
 *   1) npm install            (@playwright/mcp 설치)
 *   2) npx playwright install chromium   (크로미움을 node_modules 안에)
 *   3) node verify.mjs        (네트워크 0 자체검증)
 * PLAYWRIGHT_BROWSERS_PATH=0 은 (2)에서 크로미움을 node_modules 안에 넣기 위해 필요.
 * (verify.mjs 는 spawn 시 자체적으로 이 env 를 주입하므로 별도 설정 불필요.)
 *
 * 실행:  npm run setup     또는     node setup.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isWin = process.platform === 'win32'
const npm = isWin ? 'npm.cmd' : 'npm'
const npx = isWin ? 'npx.cmd' : 'npx'

// 크로미움을 전역 캐시가 아니라 node_modules 안에 설치 → 폴더 하나로 자체완결
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' }

const steps = [
  { label: '[1/3] npm install', cmd: npm, args: ['install'] },
  { label: '[2/3] playwright install chromium', cmd: npx, args: ['playwright', 'install', 'chromium'] },
  { label: '[3/3] 자체검증 (verify.mjs)', cmd: process.execPath, args: ['verify.mjs'] },
]

for (const { label, cmd, args } of steps) {
  console.log(`\n=== ${label} ===`)
  const r = spawnSync(cmd, args, { cwd: __dirname, env, stdio: 'inherit' })
  if (r.status !== 0) {
    const detail = r.error ? ` — ${r.error.message}` : r.signal ? ` — signal ${r.signal}` : ''
    console.error(`\n❌ 실패: ${label} (exit ${r.status ?? 'null'})${detail}`)
    console.error('   위 로그를 확인하세요. 폐쇄망이면 run-closed-win.bat / SETUP-COMPANY-PC.md 참고.')
    process.exit(1)
  }
}

console.log('\n🎉 준비 완료. 이 폴더에서  claude  실행 → playwright MCP approve → 자연어로 조작.')

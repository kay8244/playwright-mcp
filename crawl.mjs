/**
 * 결정적 크롤러 (반복 작업 "굳히기"용)
 * ---------------------------------------------------------------
 * 에이전트형 MCP 와 달리 LLM 분석이 전혀 없다. 고정 셀렉터를 그대로 재생 →
 * 매번 수 초, 결과 재현·감사 가능. "매일/반복되는 똑같은 작업"에 쓴다.
 *
 * 흐름: MCP 로 흐름을 한 번 찾고 → 그 셀렉터를 아래 crawl(page) 에 박아 운영.
 *
 * 사용:
 *   npm run crawl                                   (기본: 동봉 미니샵 데모)
 *   node crawl.mjs --url "https://..." --out out.json
 *   node crawl.mjs --headed                          (화면 보며 디버깅)
 *   node crawl.mjs --auth auth.json                  (로그인 세션 재사용)
 *
 * 브라우저는 setup/verify 와 동일하게 node_modules 안 크로미움을 쓴다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 다른 것들과 동일하게: 브라우저를 node_modules 안에서 찾음 (폐쇄망/버전매칭 안전).
// ⚠ playwright-core 는 import(초기화) 시점에 이 env 를 읽으므로, env 를 먼저 세팅한 뒤
//    동적 import 해야 한다. (정적 import 는 최상단 코드보다 먼저 실행돼 너무 늦음)
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '0'
const { chromium } = await import('playwright-core')

// ── 인자 파싱 ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const opt = (name, def) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def
}
const HEADED = argv.includes('--headed')
const OUT = opt('--out', 'crawl-result.json')
const AUTH = opt('--auth', null)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 기본 대상: 동봉 로컬 미니샵(데모). 실제로는 --url 로 지정.
const DEFAULT_URL = 'file://' + path.resolve(__dirname, 'page-agent-shop.html')
const TARGET_URL = opt('--url', DEFAULT_URL)

async function main() {
  const browser = await chromium.launch({ headless: !HEADED })
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    ...(AUTH && fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  })
  const page = await context.newPage()
  try {
    console.log('▶ 열기:', TARGET_URL)
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const data = await crawl(page)
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2), 'utf8')
    const n = Array.isArray(data) ? data.length : 1
    console.log(`✔ ${n}건 저장: ${path.resolve(OUT)}`)
  } catch (err) {
    console.error('❌ 크롤링 실패:', err.message)
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

// ============================================================================
// 사이트별 크롤링 로직 — 여기만 대상 사이트에 맞게 바꾸면 된다.
// (기본 구현: 동봉 미니샵에서 "나이키" 검색 → 리뷰 많은순 → 상품 목록 수집)
// 셀렉터는 MCP 가 조작할 때 쓴 것을 받거나, `npx playwright codegen <URL>` 로 찾는다.
// ============================================================================
async function crawl(page) {
  await page.fill('#searchInput', '나이키')
  await page.click('#searchBtn')
  await page.selectOption('#sortSelect', 'reviews_desc')

  const cards = page.locator('.card')
  await cards.first().waitFor()
  const count = await cards.count()

  const items = []
  for (let i = 0; i < count; i++) {
    const c = cards.nth(i)
    items.push({
      name: (await c.locator('.pname').innerText()).trim(),
      price: (await c.locator('.price').innerText()).trim(),
      meta: (await c.locator('.meta').innerText()).replace(/\n/g, ' ').trim(),
    })
  }
  return items
}

main()

# playwright-mcp — LLM이 브라우저를 스스로 운전하는 Playwright MCP

Claude Code가 브라우저를 **스스로 운전**(navigate·키인·클릭·추출)하게 해주는 Playwright MCP 패키지.
셀렉터 하드코딩 없이, 처음 보는 페이지도 LLM이 스냅샷을 읽고 알아서 조작한다.
의존성은 `@playwright/mcp` 하나뿐.

> **이 가이드는 WSL / 리눅스 환경 기준이다.** (내부 Claude Code가 WSL 안에서 돌아감)
> 명령은 전부 **bash 문법** — PowerShell/cmd 문법(`$env:...`, `set ...`)은 WSL에서 `command not found` 난다.
> 브라우저도 **리눅스 크로미움**이 필요하다. 설치·실행 전부 **WSL 안에서** 한다.

## 데모
자연어 한 줄 → LLM이 **나이키 검색 → 리뷰 많은 순 정렬 → 1등 상품 상세**까지 스스로 조작.

![playwright-mcp 데모: 나이키 검색 → 리뷰순 정렬 → 1등 상품 상세](assets/demo.gif)

> 위 화면은 동봉된 `page-agent-shop.html`(로컬 전용, 네트워크 0)을 대상으로 한 실제 실행 녹화입니다.

## 전제
- **Node.js 18+** (WSL 안에) — 확인: `node --version`
- **Claude Code** (WSL 안에서 구동)

---

## A. 설치 (WSL에서 npm/CDN 접속 가능할 때) — 한 줄이면 끝
```bash
git clone https://github.com/kay8244/playwright-mcp.git
cd playwright-mcp
npm run setup     # npm install + 리눅스 크로미움 + 자체검증(verify)까지 한 방
claude            # 초록불 뜨면 실행 → playwright MCP approve → 자연어로 조작
```
아래 **초록불**이 뜨면 준비 완료:
```
✅ MCP 기동 — Playwright ...
✅ 툴 노출 — NN 개
✅ navigate — 로컬 페이지 열림 (네트워크 0)
✅ type + click — 키인/클릭 동작
✅ 결과추출 — "나이키" 매칭 N 건
🎉 준비 완료.
```
> 이미 설치된 환경을 다시 확인만 하려면: `npm run verify`

크로미움은 받았는데 **실행이 안 되면**(리눅스 구동 라이브러리 부족):
```bash
sudo npx playwright install-deps chromium
#   또는 한 번에:  sudo npx playwright install --with-deps chromium
```

<details>
<summary>수동으로 단계별 실행하고 싶다면</summary>

```bash
npm install
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
node verify.mjs
claude
```
</details>

## B. 폐쇄망 오프라인 (WSL에서 npm/CDN 막힘) — 폴더째 반입
브라우저 바이너리는 **OS 종속**이라, **인터넷 되는 WSL(같은 리눅스 x64) PC에서** 폴더째 만들어 반입한다.
`npm run setup` 은 `PLAYWRIGHT_BROWSERS_PATH=0` 으로 크로미움을 **`node_modules` 안**에 넣으므로,
이 폴더를 통째로 압축해 옮기면 별도 패커 없이 자체완결 번들이 된다.
```bash
# [인터넷 되는 WSL PC]
git clone https://github.com/kay8244/playwright-mcp.git
cd playwright-mcp
npm run setup                       # node_modules 안에 크로미움까지 설치됨
cd ..
tar czf playwright-mcp-offline.tgz --exclude=.git playwright-mcp
#   → 이 .tgz 를 USB / 사내 저장소로 반입

# [폐쇄망 WSL PC]  압축 풀고
tar xzf playwright-mcp-offline.tgz
cd playwright-mcp
npm run verify                      # 네트워크 0 자체검증
claude
```
> ⚠ 준비 PC와 폐쇄망 PC의 **OS/CPU가 같아야** 한다(리눅스 x64 등). 다른 OS에서 받은 크로미움은 못 쓴다.
> 폐쇄망 PC(WSL)에 Node 가 없으면 먼저 설치해 둔다.

---

## 직접 시켜보기 (approve 후 자연어로)
```
page-agent-shop.html 열어서 나이키 검색하고 리뷰 많은 순 1등 상품 상세페이지 열어줘
```
```
방금 그 페이지에서 상품명과 가격만 뽑아서 표로 정리해줘
```
→ LLM이 `browser_navigate / browser_snapshot / browser_type / browser_click` 을 알아서 호출한다.

## 옵션 (`.mcp.json` 의 args)
| 목적 | 방법 |
|---|---|
| 화면 보며 실행(headed) | 기본 headed. 무인이면 `"--headless"` 추가 |
| **사내 로그인 유지**(SSO/키인) | `"--isolated"` 빼고 `"--storage-state","auth.json"` 추가 |
| 특정 사내 도메인만 허용 | `"--allowed-origins","https://사내앱.도메인"` 추가 |

> **auth.json**(세션 재사용): 로그인 가능한 환경에서 한 번
> `npx playwright codegen --save-storage=auth.json <URL>` → 생성 파일을 이 폴더에 두고 위 옵션 켜기.
> (`auth.json` 은 로그인 토큰이라 `.gitignore` 처리됨 — git 에 올라가지 않는다.)

## 파일
- `.mcp.json` — Claude Code용 MCP 설정. **절대경로 없음**, `env`로 `PLAYWRIGHT_BROWSERS_PATH=0`
- `setup.mjs` — 원커맨드 부트스트랩(install→크로미움→verify). `npm run setup` 으로 호출
- `verify.mjs` — 자체검증(navigate→키인→클릭→결과추출, 네트워크 0)
- `page-agent-shop.html` — 데모/검증 대상 페이지
- `package.json` — `@playwright/mcp@0.0.78` 고정

## 트러블슈팅
| 증상 | 원인 / 해결 |
|---|---|
| `$env:...` / `set ...` 에서 `command not found` | WSL(리눅스)인데 Windows 셸 문법을 씀. 이 가이드의 **bash 명령**을 쓸 것 |
| `node: command not found` | WSL에 Node 18+ 미설치 → 설치 후 재시도 |
| `npm run setup` 이 크로미움 다운로드에서 멈춤 | CDN 차단(폐쇄망). 위 **B** 경로로 반입 |
| 크로미움은 받았는데 브라우저 실행 실패 | 리눅스 구동 라이브러리 부족 → `sudo npx playwright install-deps chromium` |
| verify 초록불이 안 뜨고 `[mcp]` 에러 | `node_modules/@playwright/mcp` 손상 → `npm install` 다시. 로그의 `[mcp]` 줄 확인 |
| `claude` 시작 시 playwright MCP 가 안 보임 | 이 폴더 안에서 `claude` 를 실행했는지 확인(`.mcp.json` 이 여기 있음) |
| approve 했는데 "브라우저 없음" | Windows에서 설치한 브라우저는 WSL이 못 찾음. **설치·실행 전부 WSL에서**, `npm run verify` 통과 확인 |

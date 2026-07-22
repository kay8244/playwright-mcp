@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================================
echo  Page Agent RPA - Playwright MCP  (폐쇄망 오프라인 실행)
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 가 설치되어 있지 않습니다.
  echo         인터넷 되는 PC에서 Node 18+ .msi 를 받아 먼저 설치하세요.
  exit /b 1
)

if not exist "node_modules\@playwright\mcp\cli.js" (
  echo [ERROR] node_modules 가 없습니다. 번들 압축을 폴더째 제대로 풀었는지 확인하세요.
  exit /b 1
)

set PLAYWRIGHT_BROWSERS_PATH=0

echo.
echo [1/1] 오프라인 자체검증 실행 중... (네트워크 불필요)
node verify.mjs
if errorlevel 1 (
  echo.
  echo [FAIL] 검증 실패. 위 [mcp] 로그를 확인하세요.
  exit /b 1
)

echo.
echo ============================================================
echo  [OK] 준비 완료.
echo  이 폴더에서  claude  를 실행하고, 시작 시 playwright MCP 를
echo  approve 하면 됩니다. 이후 자연어로 브라우저를 시키세요.
echo    예) "page-agent-shop.html 열어서 나이키 검색하고 1등 상품 알려줘"
echo ============================================================
endlocal

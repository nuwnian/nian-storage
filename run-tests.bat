@echo off
REM Quick Test Setup & Run Script for Windows

echo.
echo 🚀 Nian Storage E2E Test Suite
echo ================================
echo.

REM Check if Node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Node.js is not installed. Please install Node.js first.
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ npm is not installed. Please install npm first.
  exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm version: %NPM_VERSION%
echo.

REM Check if Cypress is installed
if not exist "node_modules/cypress" (
  echo 📦 Installing Cypress...
  call npm install --save-dev cypress
  if %errorlevel% neq 0 (
    echo ❌ Failed to install Cypress
    exit /b 1
  )
)

echo ✅ Cypress is installed
echo.

REM Show test options
echo 📋 Choose test mode:
echo   1) Run all tests (headless)
echo   2) Open interactive test runner (Cypress UI)
echo   3) Run OAuth tests only
echo   4) Run file operations tests only
echo   5) Run session management tests only
echo   6) Run integration tests only
echo.

set /p choice="Select option (1-6): "

if "%choice%"=="1" (
  echo 🧪 Running all tests in headless mode...
  call npx cypress run
) else if "%choice%"=="2" (
  echo 🖥️  Opening Cypress interactive test runner...
  call npx cypress open
) else if "%choice%"=="3" (
  echo 🧪 Running OAuth login tests...
  call npx cypress run --spec "cypress/e2e/oauth-login.cy.js"
) else if "%choice%"=="4" (
  echo 🧪 Running file operations tests...
  call npx cypress run --spec "cypress/e2e/file-operations.cy.js"
) else if "%choice%"=="5" (
  echo 🧪 Running session management tests...
  call npx cypress run --spec "cypress/e2e/session-management.cy.js"
) else if "%choice%"=="6" (
  echo 🧪 Running full integration tests...
  call npx cypress run --spec "cypress/e2e/full-integration.cy.js"
) else (
  echo ❌ Invalid option
  exit /b 1
)

echo.
echo ✅ Test run completed!
echo.
echo 📖 For more information, see: cypress/README.md
pause

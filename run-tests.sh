#!/bin/bash
# Quick Test Setup & Run Script

echo "🚀 Nian Storage E2E Test Suite"
echo "================================"
echo ""

# Check if Node is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js first."
  exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed. Please install npm first."
  exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Check if Cypress is installed
if [ ! -d "node_modules/cypress" ]; then
  echo "📦 Installing Cypress..."
  npm install --save-dev cypress
  if [ $? -ne 0 ]; then
    echo "❌ Failed to install Cypress"
    exit 1
  fi
fi

echo "✅ Cypress is installed"
echo ""

# Check if backend is running
echo "🔍 Checking if backend is running on localhost:5000..."
if ! curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
  echo "⚠️  Backend appears to not be running"
  echo "   Start backend with: npm run start:backend"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Backend check passed"
echo ""

# Check if frontend is running
echo "🔍 Checking if frontend is running on localhost:3000..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "⚠️  Frontend appears to not be running"
  echo "   Start frontend with: npm run start:frontend"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Frontend check passed"
echo ""

# Show test options
echo "📋 Choose test mode:"
echo "  1) Run all tests (headless)"
echo "  2) Open interactive test runner (Cypress UI)"
echo "  3) Run OAuth tests only"
echo "  4) Run file operations tests only"
echo "  5) Run session management tests only"
echo "  6) Run integration tests only"
echo "  7) Run with video recording"
echo ""

read -p "Select option (1-7): " -n 1 -r
echo ""

case $REPLY in
  1)
    echo "🧪 Running all tests in headless mode..."
    npx cypress run
    ;;
  2)
    echo "🖥️  Opening Cypress interactive test runner..."
    npx cypress open
    ;;
  3)
    echo "🧪 Running OAuth login tests..."
    npx cypress run --spec "cypress/e2e/oauth-login.cy.js"
    ;;
  4)
    echo "🧪 Running file operations tests..."
    npx cypress run --spec "cypress/e2e/file-operations.cy.js"
    ;;
  5)
    echo "🧪 Running session management tests..."
    npx cypress run --spec "cypress/e2e/session-management.cy.js"
    ;;
  6)
    echo "🧪 Running full integration tests..."
    npx cypress run --spec "cypress/e2e/full-integration.cy.js"
    ;;
  7)
    echo "🎥 Running tests with video recording..."
    npx cypress run --record
    ;;
  *)
    echo "❌ Invalid option"
    exit 1
    ;;
esac

echo ""
echo "✅ Test run completed!"
echo ""
echo "📖 For more information, see: cypress/README.md"

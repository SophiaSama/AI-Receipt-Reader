#!/bin/bash

# Quick setup script for Playwright E2E tests (Linux/Mac)

echo "=================================================="
echo "  Playwright E2E Test Setup"
echo "=================================================="

# Create virtual environment
echo ""
echo "▶ Creating Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
echo ""
echo "▶ Installing dependencies..."
pip install -r requirements.txt

# Install browsers
echo ""
echo "▶ Installing Playwright browsers..."
playwright install --with-deps

# Create .env
echo ""
echo "▶ Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ .env file created"
fi

echo ""
echo "=================================================="
echo "✓ Setup complete!"
echo "=================================================="
echo ""
echo "To activate the virtual environment:"
echo "  source .venv/bin/activate"
echo ""
echo "To run tests:"
echo "  pytest"
echo ""

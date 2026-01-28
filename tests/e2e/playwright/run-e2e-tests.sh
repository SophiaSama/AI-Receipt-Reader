#!/bin/bash
# E2E Test Runner - Automated server startup and test execution
# Usage: ./run-e2e-tests.sh [options]
#
# Options:
#   --test-path <path>     Run specific test file or directory
#   --headed               Run tests in headed mode (visible browser)
#   --keep-server          Keep server running after tests
#   --browser <name>       Browser to use (chromium, firefox, webkit). Default: chromium
#
# Examples:
#   ./run-e2e-tests.sh
#   ./run-e2e-tests.sh --headed
#   ./run-e2e-tests.sh --test-path tests/test_health.py
#   ./run-e2e-tests.sh --browser firefox --headed

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Parse arguments
TEST_PATH=""
HEADED=false
KEEP_SERVER_RUNNING=false
BROWSER="chromium"

while [[ $# -gt 0 ]]; do
    case $1 in
        --test-path)
            TEST_PATH="$2"
            shift 2
            ;;
        --headed)
            HEADED=true
            shift
            ;;
        --keep-server)
            KEEP_SERVER_RUNNING=true
            shift
            ;;
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}[ERROR] Unknown option: $1${NC}"
            echo "Usage: $0 [--test-path <path>] [--headed] [--keep-server] [--browser <name>]"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}[E2E] SmartReceipt E2E Test Runner${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# Store current location
ORIGINAL_LOCATION=$(pwd)

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if server is already running
echo -e "${YELLOW}[CHECK] Checking if dev server is already running...${NC}"
if curl -s -f -o /dev/null --max-time 2 "http://localhost:3000" 2>/dev/null; then
    SERVER_ALREADY_RUNNING=true
    echo -e "${GREEN}[OK] Dev server is already running!${NC}"
else
    SERVER_ALREADY_RUNNING=false
    echo -e "${RED}[WARN] Dev server not running${NC}"
fi

SERVER_PID=""

# Start server if not running
if [ "$SERVER_ALREADY_RUNNING" = false ]; then
    echo ""
    echo -e "${YELLOW}[START] Starting dev server...${NC}"
    
    # Start server in background
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    
    echo -e "${YELLOW}[WAIT] Waiting for server to be ready...${NC}"
    
    MAX_ATTEMPTS=30
    ATTEMPT=0
    SERVER_READY=false
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ] && [ "$SERVER_READY" = false ]; do
        sleep 1
        if curl -s -f -o /dev/null --max-time 2 "http://localhost:3000" 2>/dev/null; then
            SERVER_READY=true
            echo -e "${GREEN}[OK] Server is ready at http://localhost:3000${NC}"
        else
            ATTEMPT=$((ATTEMPT + 1))
            echo -e "${GRAY}   Attempt $ATTEMPT/$MAX_ATTEMPTS...${NC}"
        fi
    done
    
    if [ "$SERVER_READY" = false ]; then
        echo -e "${RED}[ERROR] Server failed to start after $MAX_ATTEMPTS attempts${NC}"
        echo -e "${YELLOW}   Please check if port 3000 is available${NC}"
        echo -e "${YELLOW}   Try running 'npm run dev' manually to see errors${NC}"
        
        if [ -n "$SERVER_PID" ]; then
            kill $SERVER_PID 2>/dev/null || true
        fi
        
        cd "$ORIGINAL_LOCATION"
        exit 1
    fi
    
    # Additional health check
    echo -e "${YELLOW}[HEALTH] Checking API health endpoint...${NC}"
    HEALTH_RESPONSE=$(curl -s --max-time 5 "http://localhost:3000/api/health" 2>/dev/null || echo "")
    
    if [ -n "$HEALTH_RESPONSE" ]; then
        STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        SERVICE=$(echo "$HEALTH_RESPONSE" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
        
        if [ "$STATUS" = "healthy" ]; then
            echo -e "${GREEN}[OK] API is healthy: $SERVICE${NC}"
        else
            echo -e "${YELLOW}[WARN] API responded but status is: $STATUS${NC}"
        fi
    else
        echo -e "${YELLOW}[WARN] API health check failed (tests may still work)${NC}"
    fi
fi

echo ""
echo -e "${CYAN}[TEST] Running Playwright E2E tests...${NC}"
echo ""

# Navigate to playwright directory
cd "$PROJECT_ROOT/tests/e2e/playwright"

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo -e "${RED}[ERROR] Virtual environment not found!${NC}"
    echo -e "${YELLOW}   Run setup first: ./setup.sh${NC}"
    
    if [ "$SERVER_ALREADY_RUNNING" = false ] && [ -n "$SERVER_PID" ]; then
        echo -e "${YELLOW}[STOP] Stopping server...${NC}"
        kill $SERVER_PID 2>/dev/null || true
    fi
    
    cd "$ORIGINAL_LOCATION"
    exit 1
fi

# Build pytest command arguments
PYTEST_ARGS=()

if [ -n "$TEST_PATH" ]; then
    PYTEST_ARGS+=("$TEST_PATH")
fi

if [ "$HEADED" = true ]; then
    PYTEST_ARGS+=("--headed")
fi

PYTEST_ARGS+=("--browser" "$BROWSER" "-v")

# Display command for debugging
echo -e "${GRAY}Running: python -m pytest ${PYTEST_ARGS[*]}${NC}"
echo ""

# Run pytest directly with Python from venv
PYTHON_EXE=".venv/bin/python"

# Execute pytest and capture exit code
set +e  # Don't exit on test failures
"$PYTHON_EXE" -m pytest "${PYTEST_ARGS[@]}"
TEST_RESULT=$?
set -e

echo ""

# Cleanup
if [ "$SERVER_ALREADY_RUNNING" = false ] && [ -n "$SERVER_PID" ] && [ "$KEEP_SERVER_RUNNING" = false ]; then
    echo -e "${YELLOW}[STOP] Stopping dev server...${NC}"
    
    # Kill the npm process and its children
    if ps -p $SERVER_PID > /dev/null 2>&1; then
        # Kill the process group to ensure all child processes are terminated
        pkill -P $SERVER_PID 2>/dev/null || true
        kill $SERVER_PID 2>/dev/null || true
        
        # Wait a moment for graceful shutdown
        sleep 1
        
        # Force kill if still running
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            kill -9 $SERVER_PID 2>/dev/null || true
        fi
    fi
    
    # Also kill any node processes running vite (backup cleanup)
    pkill -f "vite" 2>/dev/null || true
    
    echo -e "${GREEN}[OK] Server stopped${NC}"
elif [ "$KEEP_SERVER_RUNNING" = true ]; then
    echo -e "${GREEN}[OK] Server left running (use --keep-server to change)${NC}"
fi

# Summary
echo ""
echo -e "${CYAN}================================${NC}"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}[PASS] All tests passed!${NC}"
else
    echo -e "${RED}[FAIL] Some tests failed (exit code: $TEST_RESULT)${NC}"
fi

echo ""

# Return to original location
cd "$ORIGINAL_LOCATION"

exit $TEST_RESULT

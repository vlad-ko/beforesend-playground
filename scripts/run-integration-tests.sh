#!/bin/bash

# Integration Test Runner
# Runs integration tests against live SDK containers
#
# Prerequisites:
#   - Docker and docker-compose installed
#   - All containers running: docker-compose up -d
#
# Usage:
#   ./scripts/run-integration-tests.sh [--start-services]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 SDK Playground Integration Tests${NC}"
echo "======================================="

# Check if --start-services flag is passed
if [[ "$1" == "--start-services" ]]; then
    echo -e "${YELLOW}Starting services...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose up -d

    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 10
fi

# Check if containers are running
echo -e "${YELLOW}Checking container status...${NC}"
cd "$PROJECT_ROOT"

REQUIRED_SERVICES=("api" "sdk-javascript" "sdk-python" "sdk-dotnet" "sdk-go")
MISSING_SERVICES=()

for service in "${REQUIRED_SERVICES[@]}"; do
    if ! docker-compose ps | grep -q "$service.*Up"; then
        MISSING_SERVICES+=("$service")
    fi
done

if [ ${#MISSING_SERVICES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing services: ${MISSING_SERVICES[*]}${NC}"
    echo -e "${YELLOW}Run 'docker-compose up -d' first, or use --start-services flag${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Required services are running${NC}"

# Check API health
echo -e "${YELLOW}Checking API health...${NC}"
if ! curl -s http://localhost:4000/health > /dev/null; then
    echo -e "${RED}❌ API is not responding${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API is healthy${NC}"

# Check individual SDK health
echo -e "${YELLOW}Checking SDK health...${NC}"
declare -A SDK_PORTS=(
    ["javascript"]=5000
    ["python"]=5001
    ["dotnet"]=5002
    ["ruby"]=5004
    ["php"]=5005
    ["go"]=5006
    ["rust"]=5010
    ["elixir"]=5011
)

for sdk in "${!SDK_PORTS[@]}"; do
    port=${SDK_PORTS[$sdk]}
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $sdk (port $port)"
    else
        echo -e "  ${YELLOW}⚠${NC} $sdk (port $port) - not responding"
    fi
done

# Run the tests
echo ""
echo -e "${GREEN}Running integration tests...${NC}"
echo "======================================="

cd "$PROJECT_ROOT/api"

# Run integration tests with verbose output
npm test -- --testPathPattern="integration" --verbose --runInBand

echo ""
echo -e "${GREEN}✓ Integration tests complete${NC}"

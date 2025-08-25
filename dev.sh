#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to catch CTRL+C
trap cleanup INT TERM

echo -e "${BLUE}Starting Movie Club Development Environment${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Start backend server
echo -e "${GREEN}Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}Backend server started (PID: $BACKEND_PID)${NC}\n"

# Give backend a moment to start
sleep 2

# Start frontend server
echo -e "${GREEN}Starting frontend server...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend server started (PID: $FRONTEND_PID)${NC}\n"

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}Both servers are running!${NC}"
echo -e "${YELLOW}Press CTRL+C to stop all servers${NC}\n"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
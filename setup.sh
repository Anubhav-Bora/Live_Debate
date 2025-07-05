#!/bin/bash

echo "========================================"
echo "Live AI Debate Arena - Setup Script"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed!"
    exit 1
fi

echo "Node.js and npm are installed correctly."
echo

echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi

echo
echo "Dependencies installed successfully!"
echo

echo "IMPORTANT: Before running the application, you need to:"
echo "1. Create a .env.local file with your environment variables"
echo "2. Set up your database (local or cloud)"
echo "3. Configure Clerk authentication"
echo "4. Set up OpenRouter API key"
echo
echo "See SETUP_INSTRUCTIONS.md for detailed steps."
echo

read -p "Do you want to start the development server now? (y/n): " choice
if [[ $choice == "y" || $choice == "Y" ]]; then
    echo
    echo "Starting development server..."
    echo "The application will be available at http://localhost:3000"
    echo "Press Ctrl+C to stop the server"
    echo
    npm run dev
else
    echo
    echo "Setup complete! Run 'npm run dev' when you're ready to start."
fi 
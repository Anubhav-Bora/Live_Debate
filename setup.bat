@echo off
echo ========================================
echo Live AI Debate Arena - Setup Script
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)

echo Node.js and npm are installed correctly.
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.

echo IMPORTANT: Before running the application, you need to:
echo 1. Create a .env.local file with your environment variables
echo 2. Set up your database (local or cloud)
echo 3. Configure Clerk authentication
echo 4. Set up OpenRouter API key
echo.
echo See SETUP_INSTRUCTIONS.md for detailed steps.
echo.

set /p choice="Do you want to start the development server now? (y/n): "
if /i "%choice%"=="y" (
    echo.
    echo Starting development server...
    echo The application will be available at http://localhost:3000
    echo Press Ctrl+C to stop the server
    echo.
    npm run dev
) else (
    echo.
    echo Setup complete! Run 'npm run dev' when you're ready to start.
)

pause 
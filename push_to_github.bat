@echo off
echo ============================================
echo  TTD AI - Pushing to GitHub
echo ============================================
echo.

cd /d "C:\Users\lior\Claude\Projects\TTD"

echo [0/7] Cleaning any broken .git folder...
if exist ".git" (
    rmdir /s /q ".git"
    echo     Removed old .git folder.
)

echo.
echo [1/7] Initializing git...
git init -b main
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: git init failed
    pause
    exit /b 1
)

echo.
echo [2/7] Staging all files...
git add -A
echo     Staged files:
git --no-pager diff --cached --name-only --stat

echo.
echo [3/7] Checking what is staged...
git status --short

echo.
echo [4/7] Committing...
git commit -m "Initial commit — TTD AI (Phase A-E complete)"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: commit failed — see above
    pause
    exit /b 1
)

echo.
echo [5/7] Setting remote...
git remote add origin https://github.com/LiorBenAttiya/ttd-ai.git

echo.
echo [6/7] Pushing to GitHub...
git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Push failed. Try running manually:
    echo   git push -u origin main
    pause
    exit /b 1
)

echo.
echo ============================================
echo  SUCCESS! Code is live on GitHub.
echo  https://github.com/LiorBenAttiya/ttd-ai
echo ============================================
echo.
pause

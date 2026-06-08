@echo off
cd /d "C:\Users\lior\Claude\Projects\TTD"
git add .github/workflows/deploy.yml frontend/vite.config.ts
git commit -m "Switch frontend deploy to GitHub Pages"
git push
echo.
echo Done! Check GitHub Actions.
pause

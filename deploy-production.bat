@echo off
echo 🚀 Deploying enhanced error handling to production...
echo.

REM Check if we're in the right directory
if not exist "shared-utils.js" (
    echo ❌ Error: shared-utils.js not found in current directory
    exit /b 1
)

REM Backup current shared-utils.js
echo 📋 Creating backup of current shared-utils.js...
copy shared-utils.js shared-utils.backup.js
echo ✅ Backup created: shared-utils.backup.js

REM Deploy production version
echo 🔧 Deploying production-optimized shared-utils.js...
copy shared-utils-prod.js shared-utils.js
echo ✅ Production version deployed

REM Git operations
echo 📤 Committing and pushing to GitHub...
git add shared-utils.js
git commit -m "Deploy enhanced error handling for ERR_ABORTED and ERR_FAILED scenarios

- Enhanced error categorization for production environments
- Progressive timeouts (5s, 8s, 12s) for better reliability
- Improved retry logic with exponential backoff
- Better fallback strategies for network failures
- Production-grade error handling for ERR_ABORTED and ERR_FAILED"

git push origin main
echo ✅ Changes pushed to GitHub main branch

echo.
echo 🎉 Production deployment completed!
echo 📊 Monitor the production logs at: https://xdren98.github.io/
echo 🔍 Check browser console for any remaining network errors
echo.
echo To rollback, run: copy shared-utils.backup.js shared-utils.js
echo.
pause
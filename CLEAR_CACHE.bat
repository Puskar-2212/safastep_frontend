@echo off
echo Clearing all caches...

echo.
echo Step 1: Removing node_modules cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Cache folder removed
) else (
    echo No cache folder found
)

echo.
echo Step 2: Removing Metro bundler cache...
if exist .expo (
    rmdir /s /q .expo
    echo .expo folder removed
) else (
    echo No .expo folder found
)

echo.
echo Step 3: Clearing watchman (if installed)...
watchman watch-del-all 2>nul
if %errorlevel% equ 0 (
    echo Watchman cleared
) else (
    echo Watchman not installed or not running
)

echo.
echo Step 4: Clearing npm cache...
call npm cache clean --force

echo.
echo ========================================
echo All caches cleared!
echo Now run: npx expo start --clear
echo ========================================
pause

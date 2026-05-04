@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo   Papyrus Electron Packager (Windows)
echo ========================================
echo.

set VERSION=v2.0.0alpha1
set ELECTRON_DIR=%USERPROFILE%\Downloads\electron-v41.1.0-win32-x64
set OUTPUT_DIR=dist-electron\Papyrus-win32-x64

if not exist "%ELECTRON_DIR%" (
    echo Error: Electron not found at %ELECTRON_DIR%
    echo Please download electron-v41.1.0-win32-x64 and place it in Downloads folder
    pause
    exit /b 1
)

if not exist "frontend\dist" (
    echo Building frontend...
    cd frontend
    call npm run build
    cd ..
)

echo Cleaning previous build...
if exist "dist-electron" rmdir /s /q "dist-electron"

echo Creating package structure...
mkdir "%OUTPUT_DIR%"

echo Copying Electron files...
xcopy /E /I /Q "%ELECTRON_DIR%\*" "%OUTPUT_DIR%\"

echo Creating app directory...
mkdir "%OUTPUT_DIR%\resources\app"

echo Copying application files...
xcopy /E /I /Q "electron\*" "%OUTPUT_DIR%\resources\app\electron\"
xcopy /E /I /Q "frontend\dist\*" "%OUTPUT_DIR%\resources\app\frontend\dist\"
copy "package.json" "%OUTPUT_DIR%\resources\app\"

echo Creating package.json for app...
(
echo {
echo   "name": "papyrus",
echo   "version": "%VERSION%",
echo   "main": "electron/main.js"
echo }
) > "%OUTPUT_DIR%\resources\app\package.json"

echo Renaming executable...
rename "%OUTPUT_DIR%\electron.exe" "Papyrus Desktop.exe"

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo Output: %OUTPUT_DIR%
echo.
pause

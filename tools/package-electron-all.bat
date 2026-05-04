@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================
echo   Papyrus Electron Packager (All Platforms)
echo ========================================
echo.

set VERSION=v2.0.0alpha1
set DOWNLOADS=%USERPROFILE%\Downloads

echo Checking for required Electron downloads...
echo.

set WIN_ELECTRON=%DOWNLOADS%\electron-v41.1.0-win32-x64
set MAC_ELECTRON=%DOWNLOADS%\electron-v41.1.0-darwin-x64
set LINUX_ELECTRON=%DOWNLOADS%\electron-v41.1.0-linux-x64

if not exist "frontend\dist" (
    echo Building frontend...
    cd frontend
    call npm run build
    cd ..
)

if exist "%WIN_ELECTRON%" (
    echo [1/3] Building Windows version...
    call :build_windows
    echo     Done: dist-electron\PapyrusDesktop-win32-x64
) else (
    echo [SKIP] Windows Electron not found at %WIN_ELECTRON%
)

echo.

if exist "%MAC_ELECTRON%" (
    echo [2/3] Building macOS version...
    call :build_mac
    echo     Done: dist-electron\Papyrus-darwin-x64
) else (
    echo [SKIP] macOS Electron not found at %MAC_ELECTRON%
    echo        Download: https://github.com/electron/electron/releases/download/v41.1.0/electron-v41.1.0-darwin-x64.zip
)

echo.

if exist "%LINUX_ELECTRON%" (
    echo [3/3] Building Linux version...
    call :build_linux
    echo     Done: dist-electron\Papyrus-linux-x64
) else (
    echo [SKIP] Linux Electron not found at %LINUX_ELECTRON%
    echo        Download: https://github.com/electron/electron/releases/download/v41.1.0/electron-v41.1.0-linux-x64.zip
)

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Output directory: dist-electron\
echo.
if exist "%WIN_ELECTRON%" echo [Windows]   PapyrusDesktop-win32-x64\Papyrus Desktop.exe
if exist "%MAC_ELECTRON%" echo [macOS]     PapyrusDesktop-darwin-x64\Papyrus Desktop.app
if exist "%LINUX_ELECTRON%" echo [Linux]     PapyrusDesktop-linux-x64\papyrus-desktop
echo.
pause
goto :eof

:build_windows
set OUTPUT=dist-electron\PapyrusDesktop-win32-x64
if exist "dist-electron" rmdir /s /q "dist-electron"
mkdir "%OUTPUT%"
xcopy /E /I /Q "%WIN_ELECTRON%\*" "%OUTPUT%\"
mkdir "%OUTPUT%\resources\app"
xcopy /E /I /Q "electron\*" "%OUTPUT%\resources\app\electron\"
xcopy /E /I /Q "frontend\dist\*" "%OUTPUT%\resources\app\frontend\dist\"
(
echo {
echo   "name": "papyrus",
echo   "version": "%VERSION%",
echo   "main": "electron/main.js"
echo }
) > "%OUTPUT%\resources\app\package.json"
rename "%OUTPUT%\electron.exe" "Papyrus Desktop.exe"
goto :eof

:build_mac
set OUTPUT=dist-electron\PapyrusDesktop-darwin-x64
mkdir "%OUTPUT%"
xcopy /E /I /Q "%MAC_ELECTRON%\*" "%OUTPUT%\"
mkdir "%OUTPUT%\Electron.app\Contents\Resources\app"
xcopy /E /I /Q "electron\*" "%OUTPUT%\Electron.app\Contents\Resources\app\electron\"
xcopy /E /I /Q "frontend\dist\*" "%OUTPUT%\Electron.app\Contents\Resources\app\frontend\dist\"
(
echo {
echo   "name": "papyrus",
echo   "version": "%VERSION%",
echo   "main": "electron/main.js"
echo }
) > "%OUTPUT%\Electron.app\Contents\Resources\app\package.json"
rename "%OUTPUT%\Electron.app" "Papyrus Desktop.app"
goto :eof

:build_linux
set OUTPUT=dist-electron\PapyrusDesktop-linux-x64
mkdir "%OUTPUT%"
xcopy /E /I /Q "%LINUX_ELECTRON%\*" "%OUTPUT%\"
mkdir "%OUTPUT%\resources\app"
xcopy /E /I /Q "electron\*" "%OUTPUT%\resources\app\electron\"
xcopy /E /I /Q "frontend\dist\*" "%OUTPUT%\resources\app\frontend\dist\"
(
echo {
echo   "name": "papyrus",
echo   "version": "%VERSION%",
echo   "main": "electron/main.js"
echo }
) > "%OUTPUT%\resources\app\package.json"
rename "%OUTPUT%\electron" "papyrus-desktop"
goto :eof

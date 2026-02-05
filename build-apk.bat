@echo off
setlocal

echo ==========================================
echo   MyApp TWA - One-Click APK Builder
echo ==========================================
echo.

:: Set paths relative to script location
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Detect or set ANDROID_SDK_ROOT
if "%ANDROID_SDK_ROOT%"=="" (
    set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
)

:: Detect or set JAVA_HOME
:: Gradle 8.14.3 does not support Java 25 (major version 69).
:: We look for Android Studio's bundled JDK or other common paths.
set "JAVA_HOME_CANDIDATE="

if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME_CANDIDATE=C:\Program Files\Android\Android Studio\jbr"
) else if exist "C:\Program Files\Eclipse Adoptium\jdk-17" (
    set "JAVA_HOME_CANDIDATE=C:\Program Files\Eclipse Adoptium\jdk-17"
) else if exist "C:\Program Files\Eclipse Adoptium\jdk-21" (
    set "JAVA_HOME_CANDIDATE=C:\Program Files\Eclipse Adoptium\jdk-21"
) else if exist "C:\Program Files\Java\jdk17" (
    set "JAVA_HOME_CANDIDATE=C:\Program Files\Java\jdk17"
)

if not "%JAVA_HOME_CANDIDATE%"=="" (
    set "JAVA_HOME=%JAVA_HOME_CANDIDATE%"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

:: Self-heal: Copy Gradle files if missing
set "MISSING_FILES=0"
if not exist "android-twa\gradlew.bat" set MISSING_FILES=1
if not exist "android-twa\gradle\wrapper\gradle-wrapper.jar" set MISSING_FILES=1
if not exist "android-twa\app\src\main\res\mipmap-hdpi" set MISSING_FILES=1

if "%MISSING_FILES%"=="1" (
    echo [INFO] Missing Gradle or Resource files. Trying to restore...
    
    REM Restore Gradle
    if exist "android\gradlew.bat" (
        if not exist "android-twa\gradle" mkdir "android-twa\gradle"
        xcopy "android\gradle" "android-twa\gradle" /s /e /y /i /q >nul
        copy "android\gradlew" "android-twa\gradlew" /y >nul
        copy "android\gradlew.bat" "android-twa\gradlew.bat" /y >nul
        echo [INFO] Restored Gradle files.
    )

    REM Restore Resources (Icons, etc)
    if exist "android\app\src\main\res" (
        xcopy "android\app\src\main\res" "android-twa\app\src\main\res" /s /e /y /i /q >nul
        echo [INFO] Restored Resource files - icons - etc.
    )

    if not exist "android-twa\gradlew.bat" (
        echo [ERROR] Could not find source files in 'android' folder to restore.
        pause
        exit /b
    )
)

if not exist "%ANDROID_SDK_ROOT%" (
    echo [ERROR] Android SDK not found at %ANDROID_SDK_ROOT%
    echo Please install Android SDK or update this script with your SDK path.
    pause
    exit /b
)

:: Ensure JAVA_HOME is set and java is reachable
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [WARNING] Compatible JDK not found in common locations.
    echo Attempting to use default java from PATH...
    java -version >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Java not found. Please install JDK 17-21 and set JAVA_HOME.
        pause
        exit /b
    )
)

echo [INFO] Using JAVA_HOME: %JAVA_HOME%
echo [INFO] Building APK...
echo.

cd android-twa
call gradlew.bat assembleDebug

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] APK generated successfully!
    echo [LOCATION] %SCRIPT_DIR%android-twa\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo [ERROR] Build failed. Please check the logs above.
)

pause

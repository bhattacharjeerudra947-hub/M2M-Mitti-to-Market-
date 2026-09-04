@echo off
REM ═══════════════════════════════════════════════════════════════
REM Mitti2Market — Start Script (Windows)
REM ═══════════════════════════════════════════════════════════════
REM Loads backend/.env and frontend/.env, then starts both services.
REM Usage: start.bat
REM ═══════════════════════════════════════════════════════════════

if not exist backend\.env (
    echo ERROR: backend/.env not found!
    echo Copy backend/.env to backend/.env and fill in your values.
    exit /b 1
)

if not exist frontend\.env (
    echo ERROR: frontend/.env not found!
    echo Copy frontend/.env.example to frontend/.env and fill in your values.
    exit /b 1
)

echo Loading backend/.env...

REM ─── Load backend .env ─────────────────────────────────────
for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" (
        if not "%%A"=="" set "%%A=%%B"
    )
)

echo Loading frontend/.env...

REM ─── Load frontend .env ────────────────────────────────────
for /f "usebackq tokens=1,* delims==" %%A in ("frontend\.env") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" (
        if not "%%A"=="" set "%%A=%%B"
    )
)

echo.
echo ========================================
echo   Mitti2Market Starting...
echo   Backend:  http://localhost:%SERVER_PORT%
echo   Frontend: http://localhost:5173
echo ========================================
echo.

REM ─── Start Backend ─────────────────────────────────────────
echo Starting Backend...
start "M2M-Backend" cmd /c "cd backend && mvn spring-boot:run"

REM ─── Wait for backend ──────────────────────────────────────
echo Waiting for backend...
timeout /t 15 /nobreak >nul

REM ─── Start Frontend ────────────────────────────────────────
echo Starting Frontend...
start "M2M-Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ========================================
echo   Both services started!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:%SERVER_PORT%
echo.
echo   Close the terminal windows to stop.
echo ========================================
pause

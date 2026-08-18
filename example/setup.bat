@echo off
setlocal EnableExtensions

REM ============================================================================
REM  setup.bat — build and launch the peak-valley-clock plugin
REM
REM  Prerequisites (one-time, see README "Install" section):
REM    1. this package is copied into the harness workspace, e.g. at
REM       packages/community/dsh-peak-valley-clock
REM    2. the three registrations described in README are already in place
REM
REM  This script assumes the harness workspace root is four levels above this
REM  file (packages/community/dsh-peak-valley-clock/example/). It then runs:
REM    pnpm install
REM    pnpm run build:lib:client
REM    pnpm dsh --profile web --patch <this package>/example/cordis.yml
REM ============================================================================

set "HARNESS_ROOT=%~dp0..\..\..\.."

REM Prefer pnpm; fall back to corepack-managed pnpm.
set "PNPM=pnpm"
where pnpm >nul 2>nul
if errorlevel 1 (
  where corepack >nul 2>nul
  if not errorlevel 1 set "PNPM=corepack pnpm"
)

pushd "%HARNESS_ROOT%" >nul 2>nul
if errorlevel 1 (
  echo [error] Cannot locate the harness workspace root at "%HARNESS_ROOT%".
  exit /b 1
)

echo [1/3] Installing workspace dependencies (pnpm install)...
call %PNPM% install
if errorlevel 1 goto :fail

echo [2/3] Building client packages, including this plugin (pnpm run build:lib:client)...
call %PNPM% run build:lib:client
if errorlevel 1 goto :fail

echo [3/3] Launching dsh web with the peak-valley overlay...
call %PNPM% dsh --profile web --patch "%~dp0cordis.yml"

popd
exit /b 0

:fail
echo.
echo [error] Setup failed. See the output above.
popd
exit /b 1

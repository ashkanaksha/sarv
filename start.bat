@echo off
title sarv - presentation
REM Opens the presentation in the browser. Works on any Windows 10/11 PC:
REM no Python, no installation and no administrator rights needed.
REM Keep this window open while presenting; close it to stop.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
if errorlevel 1 pause

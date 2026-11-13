@echo off
REM Opens the Sarvin presentation. Keep this window open while presenting.
cd /d "%~dp0"
start "" http://localhost:8766/
python tools\serve.py 8766

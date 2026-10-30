@echo off
setlocal
cd /d "%~dp0.."
echo [Birds-Eye] Running AI Engine Recording Tests...
ai_engine\venv\Scripts\python.exe ai_engine\test_recording.py %*
endlocal


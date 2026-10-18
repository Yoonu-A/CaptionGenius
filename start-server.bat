@echo off
title CaptionGenius AI - Local Server
echo ========================================================
echo   Launching CaptionGenius AI Local Server...
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause

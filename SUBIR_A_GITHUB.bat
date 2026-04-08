@echo off
echo >>> Iniciando proceso de subida a GitHub (Sapiens Analytics)...
powershell -ExecutionPolicy Bypass -File .\push_to_github.ps1
pause

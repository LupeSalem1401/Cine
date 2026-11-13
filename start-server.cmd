@echo off
cd /d "%~dp0"
echo Iniciando servidor local de CINEASTRA (simple)...
echo Abre: http://localhost:3000
echo (Ctrl+C para detener)
node server.cjs
pause

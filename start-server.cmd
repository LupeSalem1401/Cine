@echo off
cd /d "%~dp0"
echo Iniciando servidor local de CINEASTRA (simple)...
echo Abre: http://localhost:3000
echo (Ctrl+C para detener)
if "%SUPABASE_SERVICE_KEY%"=="" (
  echo.
  echo Para habilitar las acciones de administrador pega tu SUPABASE_SERVICE_KEY
  echo ^(Supabase ^> Project Settings ^> API ^> service_role^) o dejala en el archivo .env.
  set /p SUPABASE_SERVICE_KEY=Service key ^(Enter para usar .env^):
)
node server.cjs
pause

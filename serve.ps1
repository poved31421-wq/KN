# serve.ps1 - Inicia un servidor HTTP simple en el directorio actual (puerto 8000)
# Uso: abrir PowerShell en la carpeta y ejecutar: .\serve.ps1

$Port = 8000
Write-Host "Iniciando servidor en http://localhost:$Port (Ctrl+C para detener)" -ForegroundColor Cyan

if (Get-Command py -ErrorAction SilentlyContinue) {
    Write-Host "Usando 'py -3'..." -ForegroundColor Green
    py -3 -m http.server $Port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Usando 'python'..." -ForegroundColor Green
    python -m http.server $Port
} else {
    Write-Host "No se encontró Python en el sistema." -ForegroundColor Yellow
    Write-Host "Alternativas:" -ForegroundColor Yellow
    Write-Host " - Instala Python desde https://python.org e intenta de nuevo" -ForegroundColor Yellow
    Write-Host " - Usa Live Server en VS Code (extensión)" -ForegroundColor Yellow
    Write-Host " - Si tienes Node.js puedes ejecutar: npx http-server -p 8000" -ForegroundColor Yellow
    exit 1
}

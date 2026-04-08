# Script to push changes to the new Sapiens repository
# This script handles the add, commit and push process

Write-Host ">>> Iniciando proceso de subida a GitHub (Sapiens Analytics)..." -ForegroundColor Cyan

# Check if there are changes to commit
$status = git status --porcelain
if (-not $status) {
    Write-Host ">>> No hay cambios pendientes para subir." -ForegroundColor Yellow
    exit
}

# Add changes
Write-Host ">>> Agregando archivos..."
git add .

# Commit changes
$commitMessage = "Finalización de rebranding a Sapiens y actualización de repositorio remoto"
Write-Host ">>> Realizando commit: $commitMessage"
git commit -m $commitMessage

# Push to origin
$branch = git branch --show-current
if (-not $branch) { $branch = "main" }

Write-Host ">>> Subiendo a la rama: $branch..."
git push origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n>>> [ÉXITO] Cambios subidos correctamente a:" -ForegroundColor Green
    Write-Host "https://github.com/strategico1998-cmd/CLARITY---STRATEGICO.git" -ForegroundColor Green
} else {
    Write-Host "`n>>> [ERROR] No se pudo subir a GitHub. Verifica tus credenciales o conexión." -ForegroundColor Red
}

Write-Host "`nPresiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

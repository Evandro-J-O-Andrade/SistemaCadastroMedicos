# Run-Gate24.ps1
# Executa a validação de seguranca do Gate 2.4 contra o Postgres local (Docker).
# Somente leitura. Nao modifica o banco de dados.

$ErrorActionPreference = "Stop"

$container = "supabase_db_SistemaCadastroMedicos"
$db = "gate213_test"
$user = "postgres"
$sqlFile = "$PSScriptRoot\validate_gate24.sql"

Write-Host "=== Gate 2.4 — Validação de Segurança (somente leitura) ===" -ForegroundColor Cyan
Write-Host ""

# Verifica se o container está rodando
$status = docker inspect --format='{{.State.Status}}' $container 2>$null
if ($LASTEXITCODE -ne 0 -or $status -ne "running") {
    Write-Error "Container Docker '$container' nao esta em execucao. Inicie o Docker Desktop e o container."
    exit 1
}

# Copia o SQL para o container
docker cp $sqlFile $container:/tmp/validate_gate24.sql | Out-Null

# Executa a validacao
docker exec -i $container psql -U $user -d $db -f /tmp/validate_gate24.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Gate 2.4 concluido com sucesso ===" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=== Gate 2.4 falhou (veja erros acima) ===" -ForegroundColor Red
    exit $LASTEXITCODE
}

# scripts/publish_legal_docs.ps1
# GATE 3.6 — Gerador de SQL de publicação dos documentos legais v1.0.
#
# Este script NÃO acessa o banco e NÃO executa nada no Supabase.
# Ele apenas lê as minutas, valida (não vazio, >=200 chars, sem placeholder),
# calcula o hash MD5 (conteudo_hash) e emite um arquivo .sql revisável.
#
# Uso (gera o SQL, não publica):
#   pwsh -File scripts/publish_legal_docs.ps1
#   # opcional: -Output supabase/migrations/20261126130000_gate3_04_seed_legal_documents.sql
#
# A publicação real depende de autorização expressa e revisão jurídica.

param(
  [string]$Output = "supabase/migrations/20261126130000_gate3_04_seed_legal_documents.generated.sql"
)

$ErrorActionPreference = "Stop"

$docs = @(
  @{ Tipo = "terms_of_use";    Titulo = "Termos de Uso";                     Path = "docs/legal/oficial_termos_de_uso.md";                   Obrigatorio = $true },
  @{ Tipo = "responsibility";  Titulo = "Termo de Responsabilidade";         Path = "docs/legal/oficial_termo_de_responsabilidade.md";       Obrigatorio = $true },
  @{ Tipo = "privacy_notice";  Titulo = "Política de Privacidade (LGPD)";    Path = "docs/legal/oficial_politica_de_privacidade.md";          Obrigatorio = $false }
)

function Get-Md5([string]$text) {
  $md5 = [System.Security.Cryptography.MD5]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  ($md5.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Esc([string]$s) { $s.Replace("'", "''") }

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("-- GERADO por scripts/publish_legal_docs.ps1 — NÃO EXECUTADO automaticamente.")
[void]$sb.AppendLine("-- Requer aprovação institucional, revisão jurídica e autorização expressa.")
[void]$sb.AppendLine("DO `$`$")
[void]$sb.AppendLine("DECLARE")
[void]$sb.AppendLine("  v_versao TEXT := '1.0';")
[void]$sb.AppendLine("BEGIN")

foreach ($d in $docs) {
  if (-not (Test-Path $d.Path)) { throw "Arquivo não encontrado: $($d.Path)" }
  $raw = Get-Content -Raw -Encoding UTF8 $d.Path
  $content = $raw.Trim()
  if ($content.Length -lt 200) { throw "Conteúdo < 200 caracteres: $($d.Path)" }
  if ($content -match "__CONTEUDO_APROVADO_") { throw "Placeholder detectado em $($d.Path)" }

  $md5 = Get-Md5 $content
  $esc = Esc $content
  $ob = if ($d.Obrigatorio) { "true" } else { "false" }

  [void]$sb.AppendLine("  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)")
  [void]$sb.AppendLine("  VALUES ('$($d.Tipo)', v_versao, '$(Esc $d.Titulo)', E'$esc', '$md5', $ob, true)")
  [void]$sb.AppendLine("  ON CONFLICT (tipo, versao) DO NOTHING;")
}

[void]$sb.AppendLine("END;")
[void]$sb.AppendLine("`$`$;")

Set-Content -Path $Output -Value $sb.ToString() -Encoding UTF8
Write-Host "SQL gerado (não executado): $Output"
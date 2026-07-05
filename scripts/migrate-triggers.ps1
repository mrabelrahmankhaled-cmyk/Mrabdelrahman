
# =====================================================
# Classora - Database Triggers Migration Script
# From: qngdkkhnvkvgskfxnerh (OLD)
# To:   pdvjutoclddmclymwjpa (NEW)
# =====================================================

param(
    [string]$OldDbPassword = "",
    [string]$NewDbPassword = ""
)

$OLD_REF  = "qngdkkhnvkvgskfxnerh"
$NEW_REF  = "pdvjutoclddmclymwjpa"
$NEW_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdmp1dG9jbGRkbWNseW13anBhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzAyMjAxMSwiZXhwIjoyMDk4NTk4MDExfQ.fbAeIqm-ITxUsAdRCOZetkd16-kFofOJ66HZPULRZpw"

$MIGRATION_FILE = "$PSScriptRoot\..\supabase\migrations\20260703_migrate_triggers_to_new_project.sql"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Classora Triggers Migration Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ---- Method 1: Supabase CLI db push ----
Write-Host "[1] Trying Supabase CLI db push..." -ForegroundColor Yellow

$cliVersion = & npx supabase --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    Supabase CLI found: $cliVersion" -ForegroundColor Green
    
    # link to new project
    Write-Host "    Linking to new project..." -ForegroundColor Gray
    & npx supabase link --project-ref $NEW_REF 2>&1
    
    # push migrations
    Write-Host "    Pushing triggers migration..." -ForegroundColor Gray
    & npx supabase db push 2>&1
    
    Write-Host "" 
    Write-Host "[✅] Migration pushed via Supabase CLI!" -ForegroundColor Green
    exit 0
}

Write-Host "    CLI not available, trying next method..." -ForegroundColor Red

# ---- Method 2: Direct psql via connection string ----
Write-Host ""
Write-Host "[2] Trying psql direct connection..." -ForegroundColor Yellow

$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "    psql found at: $($psql.Source)" -ForegroundColor Green
    
    if (-not $OldDbPassword) {
        Write-Host "    Enter OLD project DB password (from Supabase dashboard > Settings > Database):"
        $OldDbPassword = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText
    }
    if (-not $NewDbPassword) {
        Write-Host "    Enter NEW project DB password:"
        $NewDbPassword = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText
    }

    $OLD_CONN = "postgresql://postgres:$OldDbPassword@db.$OLD_REF.supabase.co:5432/postgres"
    $NEW_CONN = "postgresql://postgres:$NewDbPassword@db.$NEW_REF.supabase.co:5432/postgres"

    # Extract triggers from old
    Write-Host "    Extracting triggers from old project..." -ForegroundColor Gray
    $triggers = & psql $OLD_CONN -t -A -c "SELECT trigger_name, event_object_table, event_manipulation, action_timing, action_statement FROM information_schema.triggers WHERE trigger_schema NOT IN ('pg_catalog','information_schema') ORDER BY event_object_table" 2>&1
    
    Write-Host ""
    Write-Host "=== TRIGGERS IN OLD PROJECT ===" -ForegroundColor Cyan
    Write-Host $triggers
    Write-Host "================================" -ForegroundColor Cyan
    
    # Apply migration to new project
    Write-Host ""
    Write-Host "    Applying triggers migration to new project..." -ForegroundColor Gray
    $result = & psql $NEW_CONN -f $MIGRATION_FILE 2>&1
    Write-Host $result
    Write-Host ""
    Write-Host "[✅] Migration applied via psql!" -ForegroundColor Green
    exit 0
}

Write-Host "    psql not found either." -ForegroundColor Red

# ---- Method 3: Manual instructions ----
Write-Host ""
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "  MANUAL MIGRATION INSTRUCTIONS" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Since automated methods failed, please do the following manually:" -ForegroundColor White
Write-Host ""
Write-Host "STEP 1 - Check triggers in OLD project:" -ForegroundColor Cyan
Write-Host "  1. Open: https://supabase.com/dashboard/project/$OLD_REF/sql/new" -ForegroundColor Gray
Write-Host "  2. Run this SQL:" -ForegroundColor Gray
Write-Host ""
Write-Host @"
SELECT trigger_name, event_object_table, event_manipulation, action_timing, action_statement
FROM information_schema.triggers 
WHERE trigger_schema NOT IN ('pg_catalog','information_schema')
ORDER BY event_object_table, trigger_name;
"@ -ForegroundColor White
Write-Host ""
Write-Host "STEP 2 - Apply triggers to NEW project:" -ForegroundColor Cyan
Write-Host "  1. Open: https://supabase.com/dashboard/project/$NEW_REF/sql/new" -ForegroundColor Gray
Write-Host "  2. Copy & paste the contents of:" -ForegroundColor Gray
Write-Host "     $MIGRATION_FILE" -ForegroundColor Yellow
Write-Host "  3. Click 'Run' or press Ctrl+Enter" -ForegroundColor Gray
Write-Host ""
Write-Host "STEP 3 - Verify:" -ForegroundColor Cyan
Write-Host "  Run the verification query at the bottom of the migration file" -ForegroundColor Gray
Write-Host ""

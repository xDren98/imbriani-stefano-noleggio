# ========================================
# DOWNLOAD BACKEND MODULARE
# Imbriani Stefano Noleggio
# ========================================

Write-Host "`n🚀 Download Backend Modulare - Imbriani Noleggio" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# Configurazione
$baseUrl = "https://raw.githubusercontent.com/xDren98/imbriani-stefano-noleggio/main/backend"
$outputDir = ".\backend"

# Lista file da scaricare
$backendFiles = @(
    "Config.gs",
    "Main.gs",
    "Auth.gs",
    "Helpers.gs",
    "DateUtils.gs",
    "EndpointsGet.gs",
    "EndpointsPost.gs",
    "README.md"
    # Aggiungi qui nuovi file quando vengono creati
    # "PrenotazioniService.gs",
    # "VeicoliService.gs",
    # "ClientiService.gs",
    # "PDFGenerator.gs",
    # "EmailService.gs",
    # "TelegramService.gs"
)

# Crea cartella se non esiste
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    Write-Host "✅ Creata cartella: $outputDir" -ForegroundColor Green
}

# Contatori
$downloaded = 0
$failed = 0

Write-Host "📥 Inizio download file...`n" -ForegroundColor Yellow

# Download file
foreach ($file in $backendFiles) {
    $url = "$baseUrl/$file"
    $output = Join-Path $outputDir $file
    
    try {
        Write-Host "📄 Download: $file" -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $output -ErrorAction Stop
        Write-Host " - ✅ OK" -ForegroundColor Green
        $downloaded++
    }
    catch {
        Write-Host " - ❌ ERRORE" -ForegroundColor Red
        Write-Host "   Dettaglio: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

# Riepilogo
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "📊 RIEPILOGO DOWNLOAD" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ File scaricati: $downloaded" -ForegroundColor Green

if ($failed -gt 0) {
    Write-Host "❌ File falliti: $failed" -ForegroundColor Red
}

Write-Host "📂 Cartella output: $outputDir" -ForegroundColor Yellow

if ($downloaded -gt 0) {
    Write-Host "`n🎯 PROSSIMI STEP:" -ForegroundColor Magenta
    Write-Host "1. Apri Google Apps Script Editor" -ForegroundColor White
    Write-Host "2. Crea nuovo progetto 'Imbriani Backend v8.9'" -ForegroundColor White
    Write-Host "3. Per ogni file .gs:" -ForegroundColor White
    Write-Host "   - Clicca '+' per aggiungere file" -ForegroundColor White
    Write-Host "   - Apri file da: $outputDir" -ForegroundColor White
    Write-Host "   - Copia contenuto nell'editor" -ForegroundColor White
    Write-Host "   - Salva con stesso nome" -ForegroundColor White
    Write-Host "4. Deploy come Web App" -ForegroundColor White
    
    Write-Host "`n📖 Documentazione: $outputDir\README.md" -ForegroundColor Cyan
}

Write-Host "`n🎉 Completato!" -ForegroundColor Green
Write-Host "========================================="`n -ForegroundColor Cyan

# Pausa finale
Read-Host "Premi ENTER per chiudere"

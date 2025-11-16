/**
 * Deploy Manager per Google Apps Script
 * 
 * Questo script prepara tutti i file backend per il deploy su GAS
 * e crea un pacchetto completo con tutte le dipendenze
 */

// Elenco di tutti i file backend da deployare
const BACKEND_FILES = [
  'backend/Config.gs',
  'backend/Auth.gs', 
  'backend/Helpers.gs',
  'backend/DateUtils.gs',
  'backend/Main.gs',
  'backend/EndpointsGet.gs',
  'backend/EndpointsPost.gs',
  'backend/ClientiService.gs',
  'backend/PrenotazioniService.gs',
  'backend/VeicoliService.gs',
  'backend/ManutenzioniService.gs',
  'backend/EmailService.gs',
  'backend/TelegramService.gs',
  'backend/PDFGenerator.gs',
  'backend/CSVImportService.gs',
  'backend/ICSImportService.gs',
  'backend/OCRService.gs'
];

// File di test e documentazione
const TEST_FILES = [
  'test-security-gas.js',
  'deploy-instructions.js'
];

/**
 * Crea un pacchetto completo per il deploy su Google Apps Script
 */
function createGasDeploymentPackage() {
  console.log('🚀 Creating Google Apps Script deployment package...');
  
  const deploymentPackage = {
    timestamp: new Date().toISOString(),
    version: '1.0.0-security-fixes',
    files: {},
    configuration: {
      requiredProperties: [
        'JWT_SECRET',
        'SPREADSHEET_ID',
        'WEBAPP_URL'
      ],
      optionalProperties: [
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_CHAT_ID',
        'EMAIL_FROM',
        'EMAIL_TO',
        'OTP_TTL_MINUTES',
        'SESSION_TTL_MINUTES'
      ]
    },
    deploymentInstructions: getDeploymentInstructions(),
    securityFixes: getSecurityFixesList()
  };
  
  // Leggi tutti i file backend
  console.log('📁 Reading backend files...');
  BACKEND_FILES.forEach(filePath => {
    try {
      const content = readFileSync(filePath, 'utf8');
      deploymentPackage.files[filePath] = {
        content: content,
        size: content.length,
        lines: content.split('\n').length
      };
      console.log(`✅ Loaded: ${filePath} (${content.length} bytes)`);
    } catch (error) {
      console.error(`❌ Error loading ${filePath}: ${error.message}`);
    }
  });
  
  // Leggi file di test
  console.log('🧪 Reading test files...');
  TEST_FILES.forEach(filePath => {
    try {
      const content = readFileSync(filePath, 'utf8');
      deploymentPackage.files[filePath] = {
        content: content,
        size: content.length,
        lines: content.split('\n').length,
        type: 'test'
      };
      console.log(`✅ Loaded: ${filePath} (${content.length} bytes)`);
    } catch (error) {
      console.error(`❌ Error loading ${filePath}: ${error.message}`);
    }
  });
  
  // Calcola statistiche
  const totalFiles = Object.keys(deploymentPackage.files).length;
  const totalBytes = Object.values(deploymentPackage.files).reduce((sum, file) => sum + file.size, 0);
  const totalLines = Object.values(deploymentPackage.files).reduce((sum, file) => sum + file.lines, 0);
  
  console.log(`\n📊 Deployment Package Statistics:`);
  console.log(`   Files: ${totalFiles}`);
  console.log(`   Total Size: ${(totalBytes / 1024).toFixed(2)} KB`);
  console.log(`   Total Lines: ${totalLines}`);
  
  return deploymentPackage;
}

/**
 * Istruzioni dettagliate per il deploy
 */
function getDeploymentInstructions() {
  return {
    step1: {
      title: "Create New Google Apps Script Project",
      actions: [
        "Go to https://script.google.com",
        "Click 'New Project'",
        "Name it 'Imbriani Noleggio Security Fixed'",
        "Delete the default myFunction() code"
      ]
    },
    step2: {
      title: "Configure Script Properties",
      actions: [
        "Go to File > Project Properties > Script Properties",
        "Add JWT_SECRET: your_secret_key_min_32_chars",
        "Add SPREADSHEET_ID: your_google_sheets_id",
        "Add WEBAPP_URL: (leave empty for now)",
        "Optional: Add TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID",
        "Optional: Add EMAIL_FROM, EMAIL_TO"
      ]
    },
    step3: {
      title: "Copy Backend Files",
      actions: [
        "Copy content from each .gs file to new files in GAS",
        "Create files with exact names: Auth.gs, Config.gs, etc.",
        "Ensure all functions are properly copied"
      ]
    },
    step4: {
      title: "Test Security Fixes",
      actions: [
        "Copy test-security-gas.js content",
        "Run runSecurityTestsGAS() function",
        "Check logs for all tests passing",
        "Fix any failing tests before deployment"
      ]
    },
    step5: {
      title: "Deploy Web App",
      actions: [
        "Click Deploy > New deployment",
        "Select type: Web app",
        "Description: 'Security Fixed v1.0'",
        "Execute as: User accessing the web app",
        "Who has access: Anyone",
        "Click Deploy and copy the URL"
      ]
    },
    step6: {
      title: "Update Configuration",
      actions: [
        "Update WEBAPP_URL in Script Properties",
        "Update frontend config.js with new URL",
        "Test all functionality end-to-end"
      ]
    }
  };
}

/**
 * Lista dei security fixes implementati
 */
function getSecurityFixesList() {
  return [
    {
      id: "JWT-001",
      title: "JWT Secret Validation",
      severity: "Critical",
      description: "Added mandatory JWT_SECRET validation to prevent system crashes",
      files: ["backend/Auth.gs"],
      status: "Fixed"
    },
    {
      id: "SEC-002", 
      title: "Remove devLogin Backdoor",
      severity: "Critical",
      description: "Removed dangerous devLogin function that allowed unauthorized access",
      files: ["backend/EndpointsPost.gs"],
      status: "Fixed"
    },
    {
      id: "RACE-003",
      title: "LockService for ID Generation",
      severity: "High",
      description: "Implemented LockService to prevent race conditions in booking ID generation",
      files: ["backend/PrenotazioniService.gs"],
      status: "Fixed"
    },
    {
      id: "XSS-004",
      title: "HTML Injection Prevention",
      severity: "High",
      description: "Added HTML escaping for all user data to prevent XSS attacks",
      files: ["admin-prenotazioni.js", "admin-ui.js"],
      status: "Fixed"
    },
    {
      id: "CSRF-005",
      title: "CSRF Token Protection",
      severity: "High",
      description: "Implemented CSRF tokens for all critical operations",
      files: ["backend/Auth.gs", "backend/EndpointsPost.gs"],
      status: "Fixed"
    },
    {
      id: "FORM-006",
      title: "Formula Injection Protection",
      severity: "Medium",
      description: "Added sanitization to prevent Google Sheets formula injection",
      files: ["backend/Helpers.gs", "backend/PrenotazioniService.gs"],
      status: "Fixed"
    },
    {
      id: "CSP-007",
      title: "Content Security Policy",
      severity: "Medium",
      description: "Removed unsafe-inline from CSP to prevent XSS",
      files: ["index.html", "area-personale.html", "admin.html"],
      status: "Fixed"
    },
    {
      id: "SRI-008",
      title: "Subresource Integrity",
      severity: "Low",
      description: "Added integrity checks for CDN resources",
      files: ["index.html", "area-personale.html", "admin.html"],
      status: "Fixed"
    }
  ];
}

/**
 * Genera un report di deploy dettagliato
 */
function generateDeploymentReport() {
  const deploymentPackage = createGasDeploymentPackage();
  
  const report = `
# GOOGLE APPS SCRIPT DEPLOYMENT REPORT

## 📦 Deployment Package Information
- **Version**: ${deploymentPackage.version}
- **Timestamp**: ${deploymentPackage.timestamp}
- **Total Files**: ${Object.keys(deploymentPackage.files).length}
- **Total Size**: ${(Object.values(deploymentPackage.files).reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(2)} KB

## 🛡️ Security Fixes Implemented
${deploymentPackage.securityFixes.map(fix => `
### ${fix.id} - ${fix.title}
- **Severity**: ${fix.severity}
- **Status**: ${fix.status}
- **Files**: ${fix.files.join(', ')}
- **Description**: ${fix.description}
`).join('\n')}

## 🔧 Deployment Instructions

${Object.entries(deploymentPackage.deploymentInstructions).map(([step, info]) => `
### Step ${step.slice(-1)}: ${info.title}
${info.actions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

## ⚠️ Important Notes

1. **JWT_SECRET Configuration**: This MUST be set before deployment
2. **Testing**: Run all security tests before production deployment
3. **Backup**: Ensure you have backups of your Google Sheets data
4. **Monitoring**: Set up error monitoring after deployment

## 🚀 Next Steps

1. Follow the deployment instructions above
2. Run security tests in GAS environment
3. Test all functionality end-to-end
4. Monitor for any issues after deployment

---
*Generated on: ${new Date().toISOString()}*
`;
  
  // Salva il report
  require('fs').writeFileSync('gas-deployment-report.md', report);
  console.log('✅ Deployment report generated: gas-deployment-report.md');
  
  return deploymentPackage;
}

// Esegui la generazione del pacchetto se richiesto
if (require.main === module) {
  generateDeploymentReport();
}

module.exports = {
  createGasDeploymentPackage,
  generateDeploymentReport,
  getSecurityFixesList
};
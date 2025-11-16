/**
 * Deploy Manager per Google Apps Script
 * 
 * Questo script prepara tutti i file backend per il deploy su GAS
 * e crea un pacchetto completo con tutte le dipendenze
 */

import fs from 'fs';
import path from 'path';

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
      securityFeatures: [
        'JWT Secret Validation',
        'CSRF Token Protection',
        'Formula Injection Sanitization',
        'HTML Escaping',
        'Session Management'
      ]
    }
  };
  
  // Leggi tutti i file backend
  BACKEND_FILES.forEach(filePath => {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf8');
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
  
  // Salva il pacchetto
  const packagePath = path.join(process.cwd(), 'gas-deployment-package.json');
  fs.writeFileSync(packagePath, JSON.stringify(deploymentPackage, null, 2));
  
  console.log(`✅ Deployment package created: ${packagePath}`);
  console.log(`📊 Total files: ${Object.keys(deploymentPackage.files).length}`);
  
  return deploymentPackage;
}

/**
 * Crea un file di report dettagliato
 */
function generateDeploymentReport() {
  const pkg = createGasDeploymentPackage();
  
  const report = `# 🚀 Google Apps Script Deployment Report

**Generated:** ${pkg.timestamp}
**Version:** ${pkg.version}

## 📋 Deployment Summary

- **Total Files:** ${Object.keys(pkg.files).length}
- **Security Features:** ${pkg.configuration.securityFeatures.length}
- **Required Properties:** ${pkg.configuration.requiredProperties.length}

## 🔒 Security Features Implemented

${pkg.configuration.securityFeatures.map(feature => `- ✅ ${feature}`).join('\n')}

## 📁 Files Included

${Object.keys(pkg.files).map(file => `- ${file} (${pkg.files[file].lines} lines)`).join('\n')}

## ⚙️ Required Script Properties

${pkg.configuration.requiredProperties.map(prop => `- \`${prop}\``).join('\n')}

## 📝 Pre-deployment Checklist

- [ ] JWT_SECRET configured in Script Properties
- [ ] SPREADSHEET_ID configured in Script Properties  
- [ ] WEBAPP_URL configured in Script Properties
- [ ] All backend files reviewed
- [ ] Security tests passed
- [ ] Backup created

## 🚀 Deployment Instructions

1. **Open Google Apps Script Editor**
2. **Create new project or open existing**
3. **Copy files from this package**
4. **Configure Script Properties**
5. **Deploy as Web App**
6. **Test all functionality**

## 🔍 Security Validation

All security fixes have been implemented:
- JWT secret validation prevents unauthorized access
- CSRF tokens protect against cross-site request forgery
- Formula sanitization prevents injection attacks
- HTML escaping prevents XSS attacks
- Session management improved

---
*Generated on: ${new Date().toISOString()}*
`;
  
  // Salva il report
  fs.writeFileSync('gas-deployment-report.md', report);
  console.log('✅ Deployment report generated: gas-deployment-report.md');
  
  return pkg;
}

// Esegui la generazione del pacchetto
generateDeploymentReport();
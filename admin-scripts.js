/* ================================================================================
   IMBRIANI NOLEGGIO - ADMIN SCRIPTS v8.0 (Anthracite/Azure Enhanced)
   Complete admin functionality with theme coordination and performance optimization
   ================================================================================ */

'use strict';

const ADMIN_VERSION = '8.0.0';
let allBookings = [];
let filteredBookings = [];
let selectedBookings = new Set();
let vehiclesChart = null;
let statusChart = null;

console.log(`%c🔧 Admin Dashboard Pro v${ADMIN_VERSION} (Anthracite/Azure)`, 'font-size: 16px; font-weight: bold; color: #3f7ec7;');

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  loadAllData();
  setupEventListeners();
  startClock();
  
  // Theme coordination check
  console.log('🎨 Theme coordination: Anthracite/Azure active');
});

function initializeDashboard() {
  console.log('🚀 Initializing Admin Dashboard Pro v8.0...');
  
  // Set default date filters (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  document.getElementById('filter-date-from').value = thirtyDaysAgo.toISOString().slice(0, 10);
  document.getElementById('filter-date-to').value = today.toISOString().slice(0, 10);
  
  // Load mock data for demo
  loadMockData();
  
  showToast('🎨 Dashboard Pro v8.0 inizializzata', 'success');
}
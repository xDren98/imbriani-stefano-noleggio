/* 🔧 Admin Dashboard Pro v8.1.0 - REAL API CALLS + Mock fallback
   Complete admin functionality with your backend integration
*/

'use strict';

const ADMIN_VERSION = '8.1.0';
let allBookings = [];
let filteredBookings = [];
let selectedBookings = new Set();
let allVehicles = [];
let vehiclesChart = null;
let statusChart = null;

console.log(`🔧 Admin Dashboard Pro v${ADMIN_VERSION} loaded`);

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  loadRealData(); // Try real API first
  setupEventListeners();
  startClock();
});

function initializeDashboard() {
  console.log('🚀 Initializing Admin Dashboard Pro');
  updateStats([]);
  renderBookingsTable([]);
}

// =====================
// REAL API CALLS with Mock Fallback
// =====================
async function loadRealData() {
  try {
    console.log('📡 Trying real API calls...');
    
    // Try real getAllBookings
    const bookingsResponse = await callAPI('getAllBookings');
    if (bookingsResponse.success) {
      allBookings = bookingsResponse.data || [];
      console.log(`✅ Real bookings loaded: ${allBookings.length}`);
    } else {
      console.log('⚠️ Real API failed, using mock bookings');
      loadMockBookings();
    }
    
    // Try real getAllVehicles
    const vehiclesResponse = await callAPI('getAllVehicles');
    if (vehiclesResponse.success) {
      allVehicles = vehiclesResponse.data || [];
      populateVehicleFilter(allVehicles);
      console.log(`✅ Real vehicles loaded: ${allVehicles.length}`);
    } else {
      console.log('⚠️ Real vehicles API failed, using mock');
      loadMockVehicles();
    }
    
    // Update UI with real/mock data
    filteredBookings = [...allBookings];
    updateStats(filteredBookings);
    renderBookingsTable(filteredBookings);
    updateCharts();
    
  } catch (error) {
    console.error('API Error - falling back to mock data:', error);
    loadMockData();
  }
}

// Mock data fallback
function loadMockData() {
  loadMockBookings();
  loadMockVehicles();
  filteredBookings = [...allBookings];
  updateStats(filteredBookings);
  renderBookingsTable(filteredBookings);
  updateCharts();
}

function loadMockBookings() {
  allBookings = [
    {
      ID: 'BOOK-2025-076',
      DataCreazione: '2025-10-25',
      NomeCompleto: 'Salvatore Ciurlia',
      CF: 'CRLSVT70C29B792U',
      Telefono: '3284780570',
      Email: 'salvatore@email.com',
      Targa: 'DN391FW',
      DataRitiro: '2025-10-23',
      OraRitiro: '08:00',
      DataConsegna: '2025-10-25',
      OraConsegna: '08:00',
      Destinazione: 'Roma Centro',
      Stato: 'Da confermare'
    }
  ];
}

function loadMockVehicles() {
  allVehicles = [
    { Targa: 'DN391FW', Marca: 'Ford', Modello: 'Transit', Posti: 9, Stato: 'Disponibile' },
    { Targa: 'AB123CD', Marca: 'Iveco', Modello: 'Daily', Posti: 9, Stato: 'Disponibile' },
    { Targa: 'EF456GH', Marca: 'Mercedes', Modello: 'Sprinter', Posti: 9, Stato: 'In manutenzione' }
  ];
  populateVehicleFilter(allVehicles);
}

// =====================
// EVENT LISTENERS
// =====================
function setupEventListeners() {
  // Refresh button
  qsId('refresh-btn')?.addEventListener('click', loadRealData);
  
  // Back to site
  qsId('back-to-site')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  // Filters
  qsId('apply-filters')?.addEventListener('click', applyFilters);
  qsId('clear-filters')?.addEventListener('click', clearFilters);
  
  // Export
  qsId('export-excel')?.addEventListener('click', () => exportToExcel(allBookings));
  qsId('export-filtered')?.addEventListener('click', () => exportToExcel(filteredBookings));
  
  // Bulk actions
  qsId('select-all')?.addEventListener('change', toggleSelectAll);
  qsId('bulk-confirm')?.addEventListener('click', () => bulkUpdateStatus('Confermata'));
  qsId('bulk-cancel')?.addEventListener('click', () => bulkUpdateStatus('Annullata'));
}

// =====================
// STATS UPDATE
// =====================
function updateStats(bookings) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  const oggi = bookings.filter(b => b.DataCreazione?.startsWith?.(today)).length;
  const settimana = bookings.filter(b => b.DataCreazione >= weekAgoStr).length;
  const daConfermare = bookings.filter(b => b.Stato === 'Da confermare').length;
  const pulminiAttivi = allVehicles.filter(v => v.Stato === 'Disponibile').length;
  
  qsId('stat-oggi').textContent = oggi;
  qsId('stat-settimana').textContent = settimana;
  qsId('stat-pulmini').textContent = pulminiAttivi;
  qsId('stat-confermare').textContent = daConfermare;
}

// =====================
// TABLE RENDERING
// =====================
function renderBookingsTable(bookings) {
  const tbody = qsId('bookings-tbody');
  if (!tbody) return;
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-row">📭 Nessuna prenotazione trovata</td></tr>';
    return;
  }
  
  tbody.innerHTML = bookings.map(booking => `
    <tr data-booking-id="${booking.ID}">
      <td>
        <input type="checkbox" class="booking-checkbox" value="${booking.ID}">
        <strong>${booking.ID}</strong>
      </td>
      <td>${formattaDataIT(booking.DataCreazione)}</td>
      <td><strong>${booking.NomeCompleto || 'N/D'}</strong></td>
      <td>
        <div class="contact-info">
          <div>${booking.CF || 'N/D'}</div>
          <small>📞 ${booking.Telefono || 'N/D'}</small>
        </div>
      </td>
      <td><span class="vehicle-badge">🚐 ${booking.Targa || 'TBD'}</span></td>
      <td>
        <div class="datetime-info">
          <strong>${formattaDataIT(booking.DataRitiro)}</strong>
          <small>🕕 ${booking.OraRitiro}</small>
        </div>
      </td>
      <td>
        <div class="datetime-info">
          <strong>${formattaDataIT(booking.DataConsegna)}</strong>
          <small>🕕 ${booking.OraConsegna}</small>
        </div>
      </td>
      <td><span class="destination">🎯 ${booking.Destinazione || 'N/D'}</span></td>
      <td><span class="status-badge ${getStatusClass(booking.Stato)}">${getStatusEmoji(booking.Stato)} ${booking.Stato}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-success" onclick="updateBookingStatus('${booking.ID}', 'Confermata')">✅</button>
          <button class="btn btn-sm btn-danger" onclick="updateBookingStatus('${booking.ID}', 'Annullata')">❌</button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Add checkbox listeners
  document.querySelectorAll('.booking-checkbox').forEach(cb => {
    cb.addEventListener('change', updateBulkActions);
  });
}

// =====================
// BOOKING STATUS UPDATE
// =====================
async function updateBookingStatus(bookingId, newStatus) {
  try {
    const response = await callAPI('updateBookingStatus', {
      id: bookingId,
      status: newStatus
    });
    
    if (response.success) {
      showToast(`✅ Prenotazione ${bookingId} aggiornata a: ${newStatus}`, 'success');
      
      // Update local data
      const booking = allBookings.find(b => b.ID === bookingId);
      if (booking) booking.Stato = newStatus;
      
      // Re-render
      applyFilters();
      updateStats(filteredBookings);
      
    } else {
      showToast(`❌ Errore aggiornamento: ${response.message}`, 'error');
    }
  } catch (error) {
    showToast('❌ Errore connessione', 'error');
  }
}

// =====================
// FILTERS
// =====================
function applyFilters() {
  const dataDa = qsId('filter-data-da')?.value;
  const dataA = qsId('filter-data-a')?.value;
  const stato = qsId('filter-stato')?.value;
  const targa = qsId('filter-targa')?.value;
  const cliente = qsId('filter-cliente')?.value?.toLowerCase();
  
  filteredBookings = allBookings.filter(booking => {
    if (dataDa && booking.DataCreazione < dataDa) return false;
    if (dataA && booking.DataCreazione > dataA) return false;
    if (stato && booking.Stato !== stato) return false;
    if (targa && booking.Targa !== targa) return false;
    if (cliente && !booking.NomeCompleto?.toLowerCase().includes(cliente)) return false;
    return true;
  });
  
  renderBookingsTable(filteredBookings);
  updateStats(filteredBookings);
}

function clearFilters() {
  qsId('filter-data-da').value = '';
  qsId('filter-data-a').value = '';
  qsId('filter-stato').value = '';
  qsId('filter-targa').value = '';
  qsId('filter-cliente').value = '';
  
  filteredBookings = [...allBookings];
  renderBookingsTable(filteredBookings);
  updateStats(filteredBookings);
}

function populateVehicleFilter(vehicles) {
  const select = qsId('filter-targa');
  if (!select) return;
  
  select.innerHTML = '<option value="">Tutti i pulmini</option>' +
    vehicles.map(v => `<option value="${v.Targa}">${v.Targa} - ${v.Marca} ${v.Modello}</option>`).join('');
}

// =====================
// BULK ACTIONS
// =====================
function toggleSelectAll(e) {
  const checkboxes = document.querySelectorAll('.booking-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = e.target.checked;
  });
  updateBulkActions();
}

function updateBulkActions() {
  const checkboxes = document.querySelectorAll('.booking-checkbox:checked');
  const count = checkboxes.length;
  
  selectedBookings.clear();
  checkboxes.forEach(cb => selectedBookings.add(cb.value));
  
  const bulkActions = qsId('bulk-actions');
  if (bulkActions) {
    bulkActions.classList.toggle('hidden', count === 0);
    bulkActions.querySelector('.bulk-count').textContent = `${count} selezionate`;
  }
}

async function bulkUpdateStatus(newStatus) {
  const promises = Array.from(selectedBookings).map(id => 
    updateBookingStatus(id, newStatus)
  );
  
  await Promise.all(promises);
  
  selectedBookings.clear();
  document.querySelectorAll('.booking-checkbox').forEach(cb => cb.checked = false);
  updateBulkActions();
}

// =====================
// EXPORT FUNCTIONALITY
// =====================
function exportToExcel(bookings) {
  if (!bookings || bookings.length === 0) {
    showToast('⚠️ Nessuna prenotazione da esportare', 'warning');
    return;
  }
  
  const worksheet = XLSX.utils.json_to_sheet(bookings.map(booking => ({
    ID: booking.ID,
    'Data Creazione': formattaDataIT(booking.DataCreazione),
    Cliente: booking.NomeCompleto,
    'Codice Fiscale': booking.CF,
    Telefono: booking.Telefono,
    Email: booking.Email,
    Targa: booking.Targa,
    'Data Ritiro': formattaDataIT(booking.DataRitiro),
    'Ora Ritiro': booking.OraRitiro,
    'Data Consegna': formattaDataIT(booking.DataConsegna),
    'Ora Consegna': booking.OraConsegna,
    Destinazione: booking.Destinazione,
    Stato: booking.Stato
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Prenotazioni');
  
  const filename = `prenotazioni-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
  
  showToast(`📊 Esportate ${bookings.length} prenotazioni in ${filename}`, 'success');
}

// =====================
// CHARTS
// =====================
function updateCharts() {
  updateVehiclesChart();
  updateStatusChart();
}

function updateVehiclesChart() {
  const ctx = qsId('pulmini-chart')?.getContext('2d');
  if (!ctx) return;
  
  const vehicleUsage = {};
  filteredBookings.forEach(booking => {
    if (booking.Targa) {
      vehicleUsage[booking.Targa] = (vehicleUsage[booking.Targa] || 0) + 1;
    }
  });
  
  if (vehiclesChart) vehiclesChart.destroy();
  
  vehiclesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(vehicleUsage),
      datasets: [{
        data: Object.values(vehicleUsage),
        backgroundColor: ['#3f7ec7', '#22c55e', '#f59e0b', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function updateStatusChart() {
  const ctx = qsId('stati-chart')?.getContext('2d');
  if (!ctx) return;
  
  const statusCounts = {};
  filteredBookings.forEach(booking => {
    const status = booking.Stato || 'N/D';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  if (statusChart) statusChart.destroy();
  
  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#f59e0b', '#22c55e', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// =====================
// UTILITIES
// =====================
function startClock() {
  const clockEl = qsId('current-time');
  if (!clockEl) return;
  
  setInterval(() => {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('it-IT');
  }, 1000);
}

function getStatusClass(status) {
  const classes = {
    'Confermata': 'status-confirmed',
    'Da confermare': 'status-pending',
    'Annullata': 'status-cancelled'
  };
  return classes[status] || 'status-unknown';
}

function getStatusEmoji(status) {
  const emojis = {
    'Confermata': '✅',
    'Da confermare': '⏳',
    'Annullata': '❌'
  };
  return emojis[status] || '❓';
}

// Global functions
window.updateBookingStatus = updateBookingStatus;
window.qsId = function(id) { return document.getElementById(id); };

console.log('✅ admin-scripts.js v8.1.0 loaded - Real API + Mock fallback');
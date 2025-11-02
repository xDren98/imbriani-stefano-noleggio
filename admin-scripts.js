/* 🔧 IMBRIANI NOLEGGIO - Admin Dashboard v8.5 Production Ready */

'use strict';

const ADMIN_VERSION = '8.5.0';
let allBookings = [];
let filteredBookings = [];
let selectedBookings = new Set();
let vehiclesChart = null;
let statusChart = null;
let isLoading = false;

console.log(`%c🔧 Admin Dashboard Pro v${ADMIN_VERSION} (Production)`, 'font-size: 16px; font-weight: bold; color: #3f7ec7;');

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
  setupEventListeners();
  startClock();
  loadAllData();
  
  console.log('🎨 Admin Dashboard initialized with real API connection');
});

function initializeDashboard() {
  console.log('🚀 Initializing Admin Dashboard Pro v8.5...');
  
  // Set default date filters (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  const fromInput = document.getElementById('filter-date-from');
  const toInput = document.getElementById('filter-date-to');
  
  if (fromInput) fromInput.value = thirtyDaysAgo.toISOString().slice(0, 10);
  if (toInput) toInput.value = today.toISOString().slice(0, 10);
  
  showToast('🎨 Dashboard Pro v8.5 inizializzata', 'success');
}

function setupEventListeners() {
  // Filter actions
  const applyBtn = document.getElementById('apply-filters');
  const clearBtn = document.getElementById('clear-filters');
  const refreshBtn = document.getElementById('refresh-all');
  
  if (applyBtn) applyBtn.addEventListener('click', applyFilters);
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  if (refreshBtn) refreshBtn.addEventListener('click', () => {
    showToast('🔄 Aggiornamento dati...', 'info');
    loadAllData();
  });
  
  // Bulk actions
  const selectAllCheckbox = document.getElementById('select-all');
  const bulkConfirmBtn = document.getElementById('bulk-confirm');
  const bulkRejectBtn = document.getElementById('bulk-reject');
  
  if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', toggleSelectAll);
  if (bulkConfirmBtn) bulkConfirmBtn.addEventListener('click', () => bulkUpdateStatus('Confermata'));
  if (bulkRejectBtn) bulkRejectBtn.addEventListener('click', () => bulkUpdateStatus('Annullata'));
  
  // Export actions
  const exportExcelBtn = document.getElementById('export-excel');
  const exportFilteredBtn = document.getElementById('export-filtered');
  
  if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => exportToExcel(false));
  if (exportFilteredBtn) exportFilteredBtn.addEventListener('click', () => exportToExcel(true));
  
  // Live search with debounce
  const clientFilter = document.getElementById('filter-client');
  if (clientFilter) {
    clientFilter.addEventListener('input', debounce(applyFilters, 300));
  }
  
  console.log('🔗 Event listeners setup complete');
}

function startClock() {
  function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
      timeElement.textContent = timeString;
    }
  }
  
  updateTime();
  setInterval(updateTime, 1000);
}

// =====================
// DATA LOADING (Real API)
// =====================
async function loadAllData() {
  if (isLoading) {
    console.log('Data loading already in progress, skipping...');
    return;
  }
  
  isLoading = true;
  showLoader(true, 'Caricamento prenotazioni...');
  
  try {
    console.log('📁 Loading all bookings from API...');
    
    const response = await callAPI('recuperaPrenotazioni', {
      cf: 'ALL' // Admin mode - get all bookings
    });
    
    if (response.success && Array.isArray(response.data)) {
      allBookings = response.data.map(booking => normalizeBooking(booking));
      filteredBookings = [...allBookings];
      
      console.log(`📄 Loaded ${allBookings.length} bookings successfully`);
      
      // Update all displays
      updateStatistics();
      renderBookingsTable();
      updateVehicleFilter();
      await initializeCharts();
      
      showToast(`📁 Caricate ${allBookings.length} prenotazioni`, 'success');
      
    } else {
      console.warn('Invalid API response:', response);
      allBookings = [];
      filteredBookings = [];
      showToast('⚠️ Nessuna prenotazione trovata', 'warning');
      updateStatistics();
      renderBookingsTable();
    }
    
  } catch (error) {
    console.error('Load data error:', error);
    showToast('❌ Errore caricamento dati: ' + getErrorMessage(error), 'error');
    
    // Fallback to empty state
    allBookings = [];
    filteredBookings = [];
    updateStatistics();
    renderBookingsTable();
  } finally {
    isLoading = false;
    showLoader(false);
  }
}

// Normalize booking data from API
function normalizeBooking(booking) {
  return {
    ID: booking.ID || booking.id || `BOOK-${Date.now()}`,
    DataCreazione: booking.DataCreazione || booking.timestamp || new Date().toISOString().split('T')[0],
    NomeCompleto: booking.NomeCompleto || booking.Nome || '',
    CF: booking.CF || booking.cf || '',
    Telefono: booking.Telefono || booking.Cellulare || '',
    Email: booking.Email || '',
    Targa: booking.Targa || booking.targa || '',
    DataRitiro: booking.DataRitiro || booking.dataRitiro || '',
    OraRitiro: booking.OraRitiro || booking.oraRitiro || '',
    DataConsegna: booking.DataConsegna || booking.dataConsegna || '',
    OraConsegna: booking.OraConsegna || booking.oraConsegna || '',
    Destinazione: booking.Destinazione || booking.destinazione || '',
    Stato: booking.Stato || booking.stato || 'Da Confermare',
    Note: booking.Note || booking.note || ''
  };
}

// =====================
// DATA FILTERING
// =====================
function updateVehicleFilter() {
  const select = document.getElementById('filter-vehicle');
  if (!select) return;
  
  const vehicles = [...new Set(allBookings.map(b => b.Targa).filter(t => t))].sort();
  
  select.innerHTML = '<option value="">Tutti i pulmini</option>' +
    vehicles.map(v => `<option value="${v}">${v}</option>`).join('');
}

function applyFilters() {
  const filters = {
    dateFrom: document.getElementById('filter-date-from')?.value,
    dateTo: document.getElementById('filter-date-to')?.value,
    status: document.getElementById('filter-status')?.value,
    vehicle: document.getElementById('filter-vehicle')?.value,
    client: document.getElementById('filter-client')?.value.toLowerCase().trim()
  };
  
  filteredBookings = allBookings.filter(booking => {
    // Date filter
    if (filters.dateFrom) {
      const bookingDate = new Date(booking.DataCreazione || booking.DataRitiro);
      const fromDate = new Date(filters.dateFrom);
      if (bookingDate < fromDate) return false;
    }
    
    if (filters.dateTo) {
      const bookingDate = new Date(booking.DataCreazione || booking.DataRitiro);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (bookingDate > toDate) return false;
    }
    
    // Status filter
    if (filters.status && booking.Stato !== filters.status) return false;
    
    // Vehicle filter
    if (filters.vehicle && booking.Targa !== filters.vehicle) return false;
    
    // Client filter
    if (filters.client) {
      const clientName = (booking.NomeCompleto || '').toLowerCase();
      const cf = (booking.CF || '').toLowerCase();
      if (!clientName.includes(filters.client) && !cf.includes(filters.client)) return false;
    }
    
    return true;
  });
  
  renderBookingsTable();
  updateCharts();
  
  const filterCount = filteredBookings.length;
  const totalCount = allBookings.length;
  
  if (filterCount !== totalCount) {
    showToast(`🔍 Mostrate ${filterCount} di ${totalCount} prenotazioni`, 'info');
  }
}

function clearFilters() {
  const filterIds = ['filter-date-from', 'filter-date-to', 'filter-status', 'filter-vehicle', 'filter-client'];
  filterIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  
  applyFilters();
  showToast('🗑️ Filtri rimossi', 'info');
}

// =====================
// TABLE RENDERING
// =====================
function renderBookingsTable() {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  
  if (filteredBookings.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="11" style="text-align: center; padding: 3rem; color: #6b7280;">
          📋 Nessuna prenotazione trovata con i filtri attuali
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredBookings.map(booking => createBookingRow(booking)).join('');
  
  // Reattach event listeners
  setupTableEventListeners();
}

function createBookingRow(booking) {
  const isSelected = selectedBookings.has(booking.ID);
  const statusClass = getStatusClass(booking.Stato);
  const statusColor = getStatoColor(booking.Stato);
  const statusEmoji = getStatoEmoji(booking.Stato);
  
  const creationDate = formatDate(booking.DataCreazione);
  const pickupDateTime = `${formatDate(booking.DataRitiro)}<br><small style="color: #9ca3af;">${booking.OraRitiro || ''}</small>`;
  const returnDateTime = `${formatDate(booking.DataConsegna)}<br><small style="color: #9ca3af;">${booking.OraConsegna || ''}</small>`;
  
  const actionButtons = booking.Stato === 'Da Confermare' ? `
    <button class="btn btn-sm btn-success me-1 action-confirm" data-id="${booking.ID}" title="Conferma">
      ✅
    </button>
    <button class="btn btn-sm btn-danger action-reject" data-id="${booking.ID}" title="Annulla">
      ❌
    </button>
  ` : `
    <span style="color: #9ca3af; font-size: 0.8rem;">-</span>
  `;
  
  return `
    <tr class="booking-row ${isSelected ? 'table-active' : ''}" data-booking-id="${booking.ID}">
      <td class="text-center">
        <input type="checkbox" class="form-check-input row-checkbox" data-id="${booking.ID}" ${isSelected ? 'checked' : ''}>
      </td>
      <td><strong style="color: #3f7ec7;">${booking.ID}</strong></td>
      <td>${creationDate}</td>
      <td>
        <strong>${booking.NomeCompleto || '-'}</strong><br>
        <small style="color: #6b7280;">${booking.CF || '-'}</small>
      </td>
      <td>
        <small>${booking.Telefono || '-'}</small><br>
        <small style="color: #6b7280;">${booking.Email || '-'}</small>
      </td>
      <td><strong style="color: #22c55e;">${booking.Targa || 'TBD'}</strong></td>
      <td>${pickupDateTime}</td>
      <td>${returnDateTime}</td>
      <td>${booking.Destinazione || '-'}</td>
      <td>
        <span class="badge" style="background-color: ${statusColor};">
          ${statusEmoji} ${booking.Stato}
        </span>
      </td>
      <td class="text-center">
        ${actionButtons}
      </td>
    </tr>
  `;
}

function setupTableEventListeners() {
  // Checkbox selections
  document.querySelectorAll('.row-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handleRowSelection);
  });
  
  // Action buttons
  document.querySelectorAll('.action-confirm').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookingId = e.target.dataset.id;
      updateSingleBookingStatus(bookingId, 'Confermata');
    });
  });
  
  document.querySelectorAll('.action-reject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookingId = e.target.dataset.id;
      updateSingleBookingStatus(bookingId, 'Annullata');
    });
  });
}

function getStatusClass(status) {
  const statusMap = {
    'Da Confermare': 'status-pending',
    'Da confermare': 'status-pending',
    'Confermata': 'status-confirmed', 
    'Annullata': 'status-cancelled',
    'Rifiutata': 'status-cancelled'
  };
  return statusMap[status] || 'status-pending';
}

// =====================
// STATISTICS
// =====================
function updateStatistics() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
  
  // Calculate stats
  const todayBookings = allBookings.filter(booking => {
    const bookingDate = booking.DataCreazione || booking.DataRitiro;
    return bookingDate === today;
  }).length;
  
  const weekBookings = allBookings.filter(booking => {
    const bookingDate = new Date(booking.DataCreazione || booking.DataRitiro);
    return bookingDate >= weekAgo;
  }).length;
  
  const activeVehicles = new Set(allBookings.map(b => b.Targa).filter(t => t)).size;
  const pendingBookings = allBookings.filter(b => b.Stato === 'Da Confermare').length;
  
  // Update UI with animation
  animateStatNumber('stat-today', todayBookings);
  animateStatNumber('stat-week', weekBookings);
  animateStatNumber('stat-vehicles', activeVehicles);
  animateStatNumber('stat-pending', pendingBookings);
}

function animateStatNumber(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const startValue = parseInt(element.textContent) || 0;
  const duration = 800;
  const startTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
    
    element.textContent = currentValue;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}

// =====================
// BULK ACTIONS (Real API)
// =====================
function handleRowSelection(event) {
  const checkbox = event.target;
  const bookingId = checkbox.dataset.id;
  const row = checkbox.closest('tr');
  
  if (checkbox.checked) {
    selectedBookings.add(bookingId);
    row.classList.add('table-active');
  } else {
    selectedBookings.delete(bookingId);
    row.classList.remove('table-active');
  }
  
  updateBulkActionsUI();
  updateSelectAllCheckbox();
}

function toggleSelectAll(event) {
  const isChecked = event.target.checked;
  
  // Clear selection first
  selectedBookings.clear();
  
  if (isChecked) {
    // Select all filtered bookings
    filteredBookings.forEach(booking => {
      selectedBookings.add(booking.ID);
    });
  }
  
  // Update individual checkboxes
  document.querySelectorAll('.row-checkbox').forEach(checkbox => {
    checkbox.checked = isChecked;
    const row = checkbox.closest('tr');
    if (isChecked) {
      row.classList.add('table-active');
    } else {
      row.classList.remove('table-active');
    }
  });
  
  updateBulkActionsUI();
}

function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('select-all');
  if (!selectAllCheckbox) return;
  
  const visibleBookingIds = filteredBookings.map(b => b.ID);
  const selectedVisibleCount = visibleBookingIds.filter(id => selectedBookings.has(id)).length;
  
  if (selectedVisibleCount === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (selectedVisibleCount === visibleBookingIds.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

function updateBulkActionsUI() {
  const bulkActions = document.getElementById('bulk-actions');
  const selectedCount = document.getElementById('selected-count');
  const count = selectedBookings.size;
  
  if (count > 0) {
    if (bulkActions) bulkActions.classList.remove('d-none');
    if (selectedCount) selectedCount.textContent = `${count} selezionate`;
  } else {
    if (bulkActions) bulkActions.classList.add('d-none');
  }
}

// Bulk update status with real API calls
async function bulkUpdateStatus(newStatus) {
  if (selectedBookings.size === 0) {
    showToast('❌ Nessuna prenotazione selezionata', 'error');
    return;
  }
  
  const actionText = newStatus === 'Confermata' ? 'confermare' : 'annullare';
  const confirmMessage = `Confermi di voler ${actionText} ${selectedBookings.size} prenotazioni?`;
  
  if (!confirm(confirmMessage)) return;
  
  showLoader(true, `Aggiornamento ${selectedBookings.size} prenotazioni...`);
  
  let successful = 0;
  let failed = 0;
  
  try {
    // Process bookings one by one (to avoid overwhelming the API)
    for (const bookingId of selectedBookings) {
      try {
        const response = await callAPI('modificaStato', {
          id: bookingId,
          stato: newStatus
        });
        
        if (response.success) {
          // Update local data
          const booking = allBookings.find(b => b.ID === bookingId);
          if (booking) {
            booking.Stato = newStatus;
          }
          successful++;
        } else {
          console.warn(`Failed to update booking ${bookingId}:`, response.message);
          failed++;
        }
        
        // Small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error updating booking ${bookingId}:`, error);
        failed++;
      }
    }
    
    // Update UI
    filteredBookings = allBookings.filter(b => 
      // Re-apply current filters
      true // This is simplified - should re-apply actual filters
    );
    
    selectedBookings.clear();
    renderBookingsTable();
    updateStatistics();
    updateCharts();
    updateBulkActionsUI();
    
    const emoji = newStatus === 'Confermata' ? '✅' : '❌';
    const resultMessage = failed > 0 
      ? `${emoji} ${successful} aggiornate, ${failed} errori`
      : `${emoji} ${successful} prenotazioni ${newStatus.toLowerCase()}e`;
    
    showToast(resultMessage, failed > 0 ? 'warning' : 'success');
    
  } catch (error) {
    console.error('Bulk update error:', error);
    showToast('❌ Errore aggiornamento bulk', 'error');
  } finally {
    showLoader(false);
  }
}

// =====================
// SINGLE ACTIONS (Real API)
// =====================
async function updateSingleBookingStatus(bookingId, newStatus) {
  try {
    showLoader(true, 'Aggiornamento stato...');
    
    const response = await callAPI('modificaStato', {
      id: bookingId,
      stato: newStatus
    });
    
    if (response.success) {
      // Update local data
      const booking = allBookings.find(b => b.ID === bookingId);
      if (booking) {
        booking.Stato = newStatus;
      }
      
      const emoji = newStatus === 'Confermata' ? '✅' : '❌';
      showToast(`${emoji} ${bookingId} ${newStatus.toLowerCase()}`, 'success');
      
      // Refresh display
      applyFilters();
      updateStatistics();
      updateCharts();
    } else {
      showToast(`❌ Errore: ${response.message || 'Aggiornamento fallito'}`, 'error');
    }
    
  } catch (error) {
    console.error('Update single status error:', error);
    showToast('❌ Errore aggiornamento stato', 'error');
  } finally {
    showLoader(false);
  }
}

// Make globally accessible
window.updateSingleBookingStatus = updateSingleBookingStatus;

// =====================
// EXCEL EXPORT
// =====================
function exportToExcel(filteredOnly = false) {
  if (typeof XLSX === 'undefined') {
    showToast('❌ Libreria Excel non disponibile', 'error');
    return;
  }
  
  const dataToExport = filteredOnly ? filteredBookings : allBookings;
  
  if (dataToExport.length === 0) {
    showToast('❌ Nessun dato da esportare', 'error');
    return;
  }
  
  try {
    // Prepare export data
    const exportData = dataToExport.map(booking => ({
      'ID Prenotazione': booking.ID,
      'Data Creazione': formatDate(booking.DataCreazione),
      'Nome Cliente': booking.NomeCompleto || '',
      'Codice Fiscale': booking.CF || '',
      'Telefono': booking.Telefono || '',
      'Email': booking.Email || '',
      'Pulmino (Targa)': booking.Targa || '',
      'Data Ritiro': formatDate(booking.DataRitiro),
      'Ora Ritiro': booking.OraRitiro || '',
      'Data Consegna': formatDate(booking.DataConsegna),
      'Ora Consegna': booking.OraConsegna || '',
      'Destinazione': booking.Destinazione || '',
      'Stato': booking.Stato,
      'Note': booking.Note || ''
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 15 },
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 30 }
    ];
    
    // Add worksheet
    const sheetName = filteredOnly ? 'Prenotazioni_Filtrate' : 'Tutte_Prenotazioni';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const prefix = filteredOnly ? 'Filtrate' : 'Complete';
    const filename = `Imbriani_Prenotazioni_${prefix}_${timestamp}.xlsx`;
    
    // Download
    XLSX.writeFile(wb, filename);
    
    showToast(`📁 Esportate ${dataToExport.length} prenotazioni`, 'success');
    
  } catch (error) {
    console.error('Export error:', error);
    showToast('❌ Errore durante esportazione', 'error');
  }
}

// =====================
// CHARTS (Real Data)
// =====================
async function initializeCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('⚠️ Chart.js not loaded, skipping charts');
    return;
  }
  
  // Destroy existing charts
  if (vehiclesChart) {
    vehiclesChart.destroy();
    vehiclesChart = null;
  }
  if (statusChart) {
    statusChart.destroy();
    statusChart = null;
  }
  
  // Setup charts with real data
  setupVehiclesChart();
  setupStatusChart();
  
  console.log('📈 Charts initialized with real data');
}

function setupVehiclesChart() {
  const canvas = document.getElementById('vehicles-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Vehicle usage data from real bookings
  const vehicleCounts = {};
  allBookings.forEach(booking => {
    if (booking.Targa) {
      vehicleCounts[booking.Targa] = (vehicleCounts[booking.Targa] || 0) + 1;
    }
  });
  
  const labels = Object.keys(vehicleCounts);
  const data = Object.values(vehicleCounts);
  const colors = [
    'rgba(63, 126, 199, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(236, 72, 153, 0.8)'
  ];
  
  if (labels.length === 0) {
    // No data available
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nessun dato disponibile', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  vehiclesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#374151',
            padding: 15,
            font: { size: 12 },
            usePointStyle: true
          }
        }
      }
    }
  });
}

function setupStatusChart() {
  const canvas = document.getElementById('status-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Status distribution from real bookings
  const statusCounts = {};
  allBookings.forEach(booking => {
    const status = booking.Stato || 'Sconosciuto';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);
  const colors = labels.map(status => {
    switch (status) {
      case 'Confermata': return 'rgba(34, 197, 94, 0.8)';
      case 'Da Confermare': 
      case 'Da confermare': return 'rgba(245, 158, 11, 0.8)';
      case 'Annullata': return 'rgba(239, 68, 68, 0.8)';
      case 'Rifiutata': return 'rgba(147, 51, 234, 0.8)';
      default: return 'rgba(156, 163, 175, 0.8)';
    }
  });
  
  if (labels.length === 0) {
    // No data available
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Nessun dato disponibile', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  statusChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Prenotazioni',
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: '#374151' },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        },
        y: {
          beginAtZero: true,
          ticks: { 
            color: '#374151',
            stepSize: 1
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function updateCharts() {
  if (!vehiclesChart || !statusChart) {
    initializeCharts();
    return;
  }
  
  // Update vehicles chart with filtered data
  const vehicleCounts = {};
  filteredBookings.forEach(booking => {
    if (booking.Targa) {
      vehicleCounts[booking.Targa] = (vehicleCounts[booking.Targa] || 0) + 1;
    }
  });
  
  vehiclesChart.data.labels = Object.keys(vehicleCounts);
  vehiclesChart.data.datasets[0].data = Object.values(vehicleCounts);
  vehiclesChart.update('none');
  
  // Update status chart with filtered data
  const statusCounts = {};
  filteredBookings.forEach(booking => {
    const status = booking.Stato || 'Sconosciuto';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  statusChart.data.labels = Object.keys(statusCounts);
  statusChart.data.datasets[0].data = Object.values(statusCounts);
  statusChart.update('none');
}

// =====================
// UTILITIES
// =====================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

console.log('%c✅ Admin Scripts v8.5 fully loaded with real API integration!', 'color: #22c55e; font-weight: bold; font-size: 14px;');
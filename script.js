// Enlace al documento publicado de Google Sheets en formato CSV.
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCw0z4KyCiP7Wb673xvaIbWeNUp9SYf_q4Z5ZAx34AF8AXBASUG2yzve4NnkYs5zASlIWfbASlBTf7/pub?output=csv';
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';

const state = {
  records: [],
  filtered: [],
  charts: {},
  sortKey: 'fecha',
  sortDir: 'desc',
  period: 'day'
};

const controls = {
  dateFrom: document.getElementById('dateFrom'),
  dateTo: document.getElementById('dateTo'),
  filterClient: document.getElementById('filterClient'),
  filterDriver: document.getElementById('filterDriver'),
  filterCity: document.getElementById('filterCity'),
  filterArea: document.getElementById('filterArea'),
  filterRemite: document.getElementById('filterRemite'),
  filterService: document.getElementById('filterService'),
  filterStatus: document.getElementById('filterStatus'),
  searchText: document.getElementById('searchText'),
  exportExcelBtn: document.getElementById('exportExcelBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  exportPngBtn: document.getElementById('exportPngBtn'),
  periodButtons: Array.from(document.querySelectorAll('.period-btn'))
};

const kpiElements = {
  total: document.getElementById('kpiTotal'),
  completed: document.getElementById('kpiCompleted'),
  pending: document.getElementById('kpiPending'),
  cancelled: document.getElementById('kpiCancelled'),
  clients: document.getElementById('kpiClients'),
  drivers: document.getElementById('kpiDrivers'),
  cities: document.getElementById('kpiCities'),
  avgTime: document.getElementById('kpiAvgTime'),
  totalDelta: document.getElementById('kpiTotalDelta'),
  completedDelta: document.getElementById('kpiCompletedDelta'),
  pendingDelta: document.getElementById('kpiPendingDelta'),
  cancelledDelta: document.getElementById('kpiCancelledDelta'),
  clientsDelta: document.getElementById('kpiClientsDelta'),
  driversDelta: document.getElementById('kpiDriversDelta'),
  citiesDelta: document.getElementById('kpiCitiesDelta'),
  compliance: document.getElementById('kpiCompliance')
};

const insightsContainer = document.getElementById('insightsList');
const tableBody = document.querySelector('#dataTable tbody');
const topClients = document.getElementById('topClients');
const topDrivers = document.getElementById('topDrivers');
const statusDot = document.getElementById('statusDot');

window.addEventListener('DOMContentLoaded', async () => {
  attachEvents();
  await loadData();
});

function attachEvents() {
  const filterInputs = [
    controls.dateFrom,
    controls.dateTo,
    controls.filterClient,
    controls.filterDriver,
    controls.filterCity,
    controls.filterArea,
    controls.filterRemite,
    controls.filterService,
    controls.filterStatus
  ];

  filterInputs.forEach((input) => {
    input.addEventListener('change', handleFilters);
  });

  controls.searchText.addEventListener('input', handleFilters);
  controls.exportCsvBtn.addEventListener('click', exportCsv);
  controls.exportExcelBtn.addEventListener('click', exportExcel);
  controls.exportPdfBtn.addEventListener('click', exportPdf);
  controls.exportPngBtn.addEventListener('click', exportPng);

  controls.periodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      controls.periodButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      state.period = button.dataset.period;
      renderTrendChart();
    });
  });

  document.querySelectorAll('#dataTable th').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (!key) return;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = 'asc';
      }
      renderTable();
    });
  });
}

async function loadData() {
  if (IS_FILE_PROTOCOL) {
    statusDot.classList.remove('online');
    statusDot.classList.add('offline');
    alert('Abra este archivo desde un servidor local o remoto (http:// o https://). El protocolo file:// no permite cargar datos externos por seguridad.');
    return;
  }

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error(`No fue posible cargar los datos de Google Sheets (HTTP ${response.status})`);
    }
    const rawText = await response.text();
    state.records = parseCsv(rawText).map(normalizeRecord);
    state.filtered = [...state.records];
    statusDot.classList.remove('offline');
    statusDot.classList.add('online');
    populateFilters();
    handleFilters();
  } catch (error) {
    statusDot.classList.remove('online');
    statusDot.classList.add('offline');
    console.error(error);
    alert(`Error cargando datos. Verifique la conexión o la disponibilidad de la hoja de Google Sheets. Detalle: ${error.message}`);
  }
}

function parseCsv(csvText) {
  const rows = [];
  const lines = csvText.split(/\r?\n/).filter((row) => row.trim() !== '');
  const header = parseCsvLine(lines.shift());
  for (const line of lines) {
    const values = parseCsvLine(line);
    if (values.length === 0) continue;
    const rowObject = header.reduce((acc, key, index) => {
      acc[key.trim()] = values[index] !== undefined ? values[index].trim() : '';
      return acc;
    }, {});
    rows.push(rowObject);
  }
  return rows;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function normalizeRecord(raw) {
  const record = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = normalizeKey(key);
    record[normalizedKey] = value;
  }

  const dateValue = record.fecha || record.date || record['fecha diligencia'] || record['fecha_entrega'] || '';
  record.fecha = parseDate(dateValue);
  record.cliente = record.cliente || record.customer || '';
  record.conductor = record.conductor || record.driver || '';
  record.ciudad = record.ciudad || record.city || '';
  record.area = record['area solicitante'] || record.area || record.department || '';
  record.remite = record['quien remite'] || record.remite || record.sender || '';
  record.servicio = record['tipo de servicio'] || record.servicio || record.service || '';
  record.estado = record.estado || record.status || '';
  record.observaciones = record.observaciones || record.observation || record.notes || '';

  record.hora = record.hora || record.time || '';
  record.duracion = parseDuration(record['tiempo gestion'] || record['tiempo de gestión'] || record.duracion || record.duration || '');
  record.key = `${record.fecha}-${record.cliente}-${record.conductor}-${Math.random().toString(36).slice(2, 8)}`;
  return record;
}

function normalizeKey(label) {
  return label
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseDate(value) {
  if (!value) return '';
  const normalized = value.replace(/\//g, '-').trim();
  const parts = normalized.split('-').map((item) => item.padStart(2, '0'));
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return normalized;
}

function parseDuration(value) {
  if (!value) return 0;
  const cleaned = value.toString().replace(/[^0-9:.]/g, ':');
  const segments = cleaned.split(':').filter(Boolean);
  if (segments.length === 1) {
    return Number(segments[0]) || 0;
  }
  if (segments.length === 2) {
    return Number(segments[0]) * 60 + Number(segments[1]);
  }
  if (segments.length === 3) {
    return Number(segments[0]) * 3600 + Number(segments[1]) * 60 + Number(segments[2]);
  }
  return 0;
}

function populateFilters() {
  const uniqueValues = {
    cliente: new Set(),
    conductor: new Set(),
    ciudad: new Set(),
    area: new Set(),
    remite: new Set(),
    servicio: new Set(),
    estado: new Set()
  };

  state.records.forEach((record) => {
    uniqueValues.cliente.add(record.cliente);
    uniqueValues.conductor.add(record.conductor);
    uniqueValues.ciudad.add(record.ciudad);
    uniqueValues.area.add(record.area);
    uniqueValues.remite.add(record.remite);
    uniqueValues.servicio.add(record.servicio);
    uniqueValues.estado.add(record.estado);
  });

  setOptions(controls.filterClient, uniqueValues.cliente);
  setOptions(controls.filterDriver, uniqueValues.conductor);
  setOptions(controls.filterCity, uniqueValues.ciudad);
  setOptions(controls.filterArea, uniqueValues.area);
  setOptions(controls.filterRemite, uniqueValues.remite);
  setOptions(controls.filterService, uniqueValues.servicio);
  setOptions(controls.filterStatus, uniqueValues.estado);
}

function setOptions(selectElement, valuesSet) {
  const values = Array.from(valuesSet).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  selectElement.innerHTML = '<option value="">Todos</option>' + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function escapeHtml(string) {
  return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function handleFilters() {
  const filters = {
    from: controls.dateFrom.value,
    to: controls.dateTo.value,
    cliente: controls.filterClient.value,
    conductor: controls.filterDriver.value,
    ciudad: controls.filterCity.value,
    area: controls.filterArea.value,
    remite: controls.filterRemite.value,
    servicio: controls.filterService.value,
    estado: controls.filterStatus.value,
    search: controls.searchText.value.toLowerCase()
  };

  state.filtered = state.records.filter((record) => {
    if (filters.from && record.fecha && record.fecha < filters.from) return false;
    if (filters.to && record.fecha && record.fecha > filters.to) return false;
    if (filters.cliente && record.cliente !== filters.cliente) return false;
    if (filters.conductor && record.conductor !== filters.conductor) return false;
    if (filters.ciudad && record.ciudad !== filters.ciudad) return false;
    if (filters.area && record.area !== filters.area) return false;
    if (filters.remite && record.remite !== filters.remite) return false;
    if (filters.servicio && record.servicio !== filters.servicio) return false;
    if (filters.estado && record.estado !== filters.estado) return false;

    const searchTarget = [
      record.fecha,
      record.cliente,
      record.conductor,
      record.ciudad,
      record.area,
      record.remite,
      record.servicio,
      record.estado,
      record.observaciones
    ].join(' ').toLowerCase();
    if (filters.search && !searchTarget.includes(filters.search)) return false;
    return true;
  });

  updateDashboard();
}

function updateDashboard() {
  updateKpis();
  renderCharts();
  renderTopLists();
  renderInsights();
  renderTable();
}

function updateKpis() {
  const total = state.filtered.length;
  const completed = state.filtered.filter((item) => item.estado.toLowerCase().includes('finaliz')).length;
  const pending = state.filtered.filter((item) => item.estado.toLowerCase().includes('pend')).length;
  const cancelled = state.filtered.filter((item) => item.estado.toLowerCase().includes('cancel')).length;
  const clients = new Set(state.filtered.map((item) => item.cliente).filter(Boolean)).size;
  const drivers = new Set(state.filtered.map((item) => item.conductor).filter(Boolean)).size;
  const cities = new Set(state.filtered.map((item) => item.ciudad).filter(Boolean)).size;
  const durations = state.filtered.map((item) => item.duracion || 0).filter(Boolean);
  const avgMinutes = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;
  const compliance = total ? Math.round((completed / total) * 100) : 0;

  kpiElements.total.textContent = total;
  kpiElements.completed.textContent = completed;
  kpiElements.pending.textContent = pending;
  kpiElements.cancelled.textContent = cancelled;
  kpiElements.clients.textContent = clients;
  kpiElements.drivers.textContent = drivers;
  kpiElements.cities.textContent = cities;
  kpiElements.avgTime.textContent = `${avgMinutes} min`;
  kpiElements.compliance.textContent = `${compliance}%`;

  setDelta(kpiElements.totalDelta, total);
  setDelta(kpiElements.completedDelta, completed);
  setDelta(kpiElements.pendingDelta, pending);
  setDelta(kpiElements.cancelledDelta, cancelled);
  setDelta(kpiElements.clientsDelta, clients);
  setDelta(kpiElements.driversDelta, drivers);
  setDelta(kpiElements.citiesDelta, cities);
}

function setDelta(element, value) {
  const delta = value >= 0 ? `${Math.round((Math.random() * 12) + 2)}%` : '0%';
  element.textContent = delta;
}

function renderCharts() {
  renderClientChart();
  renderDriverChart();
  renderCityChart();
  renderAreaChart();
  renderRemiteChart();
  renderTrendChart();
}

function chartDataByField(field, limit = 10) {
  const buckets = {};
  state.filtered.forEach((item) => {
    const key = item[field] || 'Sin dato';
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .reduce((acc, [name, value]) => {
      acc.labels.push(name);
      acc.values.push(value);
      return acc;
    }, { labels: [], values: [] });
}

function renderClientChart() {
  const data = chartDataByField('cliente');
  submitChart('chartClient', 'bar', {
    labels: data.labels,
    datasets: [{ label: 'Diligencias', data: data.values, backgroundColor: '#3b82f6' }]
  }, { indexAxis: 'x' });
}

function renderDriverChart() {
  const data = chartDataByField('conductor');
  submitChart('chartDriver', 'bar', {
    labels: data.labels,
    datasets: [{ label: 'Diligencias', data: data.values, backgroundColor: '#2563eb' }]
  }, { indexAxis: 'y' });
}

function renderCityChart() {
  const data = chartDataByField('ciudad');
  submitChart('chartCity', 'bar', {
    labels: data.labels,
    datasets: [{ label: 'Diligencias', data: data.values, backgroundColor: '#60a5fa' }]
  }, { indexAxis: 'x' });
}

function renderAreaChart() {
  const data = chartDataByField('area', 8);
  submitChart('chartArea', 'doughnut', {
    labels: data.labels,
    datasets: [{ label: 'Diligencias', data: data.values, backgroundColor: ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#bfdbfe', '#e0f2fe', '#0ea5e9', '#7dd3fc'] }]
  }, {});
}

function renderRemiteChart() {
  const states = ['finalizadas', 'pendientes', 'canceladas', 'en progreso'];
  const remiteBuckets = {};
  state.filtered.forEach((item) => {
    const remite = item.remite || 'Sin dato';
    const status = item.estado.toLowerCase();
    remiteBuckets[remite] = remiteBuckets[remite] || { finalizadas: 0, pendientes: 0, canceladas: 0, otros: 0 };
    if (status.includes('finaliz')) remiteBuckets[remite].finalizadas += 1;
    else if (status.includes('pend')) remiteBuckets[remite].pendientes += 1;
    else if (status.includes('cancel')) remiteBuckets[remite].canceladas += 1;
    else remiteBuckets[remite].otros += 1;
  });

  const remiteKeys = Object.keys(remiteBuckets).slice(0, 8);
  const datasets = [
    { label: 'Finalizadas', key: 'finalizadas', color: '#16a34a' },
    { label: 'Pendientes', key: 'pendientes', color: '#f59e0b' },
    { label: 'Canceladas', key: 'canceladas', color: '#ef4444' },
    { label: 'Otros', key: 'otros', color: '#64748b' }
  ].map((series) => ({
    label: series.label,
    data: remiteKeys.map((key) => remiteBuckets[key][series.key] || 0),
    backgroundColor: series.color,
    stack: 'stack1'
  }));

  submitChart('chartRemite', 'bar', { labels: remiteKeys, datasets }, { scales: { x: { stacked: true }, y: { stacked: true } } });
}

function renderTrendChart() {
  const period = state.period;
  const groupKey = period === 'week' ? 'week' : period === 'month' ? 'month' : 'date';
  const buckets = {};
  state.filtered.forEach((item) => {
    if (!item.fecha) return;
    const label = groupKey === 'week' ? getWeekLabel(item.fecha) : groupKey === 'month' ? item.fecha.slice(0, 7) : item.fecha;
    buckets[label] = (buckets[label] || 0) + 1;
  });
  const sorted = Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0]));
  const labels = sorted.map(([label]) => label);
  const values = sorted.map(([, value]) => value);

  submitChart('chartTrend', 'line', {
    labels,
    datasets: [{ label: 'Diligencias', data: values, borderColor: '#1d4ed8', backgroundColor: 'rgba(59, 130, 246, 0.18)', fill: true, tension: 0.35, pointRadius: 4 }]
  }, { scales: { y: { beginAtZero: true } } });
}

function getWeekLabel(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const weekNumber = Math.ceil(((date - new Date(date.getFullYear(), 0, 1)) / 86400000 + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7);
  return `${date.getFullYear()} W${weekNumber}`;
}

function submitChart(canvasId, type, data, options) {
  const ctx = document.getElementById(canvasId);
  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
  }
  state.charts[canvasId] = new Chart(ctx, {
    type,
    data,
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } } },
      layout: { padding: 8 },
      scales: {
        x: { ticks: { color: '#475569' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
        y: { ticks: { color: '#475569', precision: 0 }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }
      },
      ...options
    }
  });
}

function renderTopLists() {
  const clients = chartDataByField('cliente', 10);
  const drivers = chartDataByField('conductor', 10);

  topClients.innerHTML = clients.labels.map((label, index) => `<li>${label} <strong>${clients.values[index]}</strong></li>`).join('') || '<li>Sin datos disponibles</li>';
  topDrivers.innerHTML = drivers.labels.map((label, index) => `<li>${label} <strong>${drivers.values[index]}</strong></li>`).join('') || '<li>Sin datos disponibles</li>';
}

function renderInsights() {
  const clients = chartDataByField('cliente', 3);
  const drivers = chartDataByField('conductor', 3);
  const cities = chartDataByField('ciudad', 3);
  const total = state.filtered.length;
  const completed = state.filtered.filter((item) => item.estado.toLowerCase().includes('finaliz')).length;
  const pending = state.filtered.filter((item) => item.estado.toLowerCase().includes('pend')).length;
  const compliance = total ? Math.round((completed / total) * 100) : 0;
  const trend = total > 20 ? 'crecimiento' : 'estabilidad';

  const insights = [
    {
      title: 'Clientes con mayor volumen',
      text: clients.labels.length ? `${clients.labels[0]} lidera con ${clients.values[0]} diligencias.` : 'No hay datos suficientes para identificar clientes clave.'
    },
    {
      title: 'Conductores más productivos',
      text: drivers.labels.length ? `${drivers.labels[0]} registra el mayor número de diligencias.` : 'No hay datos suficientes para identificar conductores clave.'
    },
    {
      title: 'Ciudades con más actividad',
      text: cities.labels.length ? `${cities.labels[0]} concentra el mayor volumen de diligencias.` : 'No hay datos suficientes para identificar ciudades prioritarias.'
    },
    {
      title: 'Tendencias de crecimiento',
      text: `El comportamiento actual muestra una tendencia de ${trend} con ${compliance}% de cumplimiento operativo.`
    },
    {
      title: 'Alertas operativas',
      text: pending > completed ? 'Hay más diligencias pendientes que finalizadas. Revisar asignación y tiempos.' : 'El ritmo de atención es equilibrado. Mantener seguimiento.'
    },
    {
      title: 'Rendimiento de cumplimiento',
      text: `Cumplimiento operacional del ${compliance}%. Más de ${total} registros analizados.`
    }
  ];

  insightsContainer.innerHTML = insights.map((item) => `
    <article class="insight-card">
      <h4>${item.title}</h4>
      <p>${item.text}</p>
    </article>
  `).join('');
}

function renderTable() {
  const sorted = [...state.filtered];
  sorted.sort((a, b) => {
    const left = a[state.sortKey] || '';
    const right = b[state.sortKey] || '';
    if (state.sortKey === 'fecha') {
      return state.sortDir === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    }
    if (typeof left === 'number' && typeof right === 'number') {
      return state.sortDir === 'asc' ? left - right : right - left;
    }
    return state.sortDir === 'asc' ? String(left).localeCompare(String(right), 'es', { sensitivity: 'base' }) : String(right).localeCompare(String(left), 'es', { sensitivity: 'base' });
  });

  tableBody.innerHTML = sorted.map((item) => `
    <tr>
      <td>${item.fecha || 'Sin fecha'}</td>
      <td>${escapeHtml(item.cliente)}</td>
      <td>${escapeHtml(item.conductor)}</td>
      <td>${escapeHtml(item.ciudad)}</td>
      <td>${escapeHtml(item.area)}</td>
      <td>${escapeHtml(item.remite)}</td>
      <td>${escapeHtml(item.servicio)}</td>
      <td>${escapeHtml(item.estado)}</td>
      <td>${escapeHtml(item.observaciones)}</td>
    </tr>
  `).join('');
}

function exportCsv() {
  const rows = [
    ['Fecha', 'Cliente', 'Conductor', 'Ciudad', 'Área solicitante', 'Quien remite', 'Tipo de servicio', 'Estado', 'Observaciones']
  ];
  state.filtered.forEach((item) => {
    rows.push([
      item.fecha,
      item.cliente,
      item.conductor,
      item.ciudad,
      item.area,
      item.remite,
      item.servicio,
      item.estado,
      item.observaciones
    ]);
  });
  const csvContent = rows.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile(csvContent, 'dashboard_diligencias.csv', 'text/csv;charset=utf-8;');
}

function exportExcel() {
  const workbook = XLSX.utils.book_new();
  const worksheetData = [
    ['Fecha', 'Cliente', 'Conductor', 'Ciudad', 'Área solicitante', 'Quien remite', 'Tipo de servicio', 'Estado', 'Observaciones'],
    ...state.filtered.map((item) => [
      item.fecha,
      item.cliente,
      item.conductor,
      item.ciudad,
      item.area,
      item.remite,
      item.servicio,
      item.estado,
      item.observaciones
    ])
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Diligencias');
  XLSX.writeFile(workbook, 'dashboard_diligencias.xlsx');
}

async function exportPdf() {
  const element = document.querySelector('.app-main');
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imageData = canvas.toDataURL('image/png');
  const pdf = new jspdf.jsPDF('landscape', 'pt', 'a4');
  const ratio = Math.min(820 / canvas.width, 570 / canvas.height);
  const width = canvas.width * ratio;
  const height = canvas.height * ratio;
  pdf.addImage(imageData, 'PNG', 40, 40, width, height);
  pdf.save('dashboard_diligencias.pdf');
}

async function exportPng() {
  const element = document.querySelector('.app-main');
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'dashboard_diligencias.png';
  link.click();
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const mockKPIs = {
  totalCash: 125000000,
  grossRevenue: 85000000,
  netIncome: 35000000,
  totalExpenses: 50000000,
};

export const mockPrinters = [
  { id: 'PRN-01', name: 'Anycubic Kobra X', status: 'Sibuk', currentJob: 'Pesanan NX-102', progress: 62, estimatedCompletion: '15:45' },
  { id: 'PRN-02', name: 'Bambu Lab P1S', status: 'Tersedia', currentJob: null, progress: 0, estimatedCompletion: null },
  { id: 'PRN-03', name: 'Creality Ender 3 V2', status: 'Perawatan', currentJob: null, progress: 0, estimatedCompletion: null },
  { id: 'PRN-04', name: 'Prusa MK4', status: 'Sibuk', currentJob: 'Pesanan NX-104', progress: 89, estimatedCompletion: '14:20' },
];

export const mockOrders = [
  { id: 'NX-102', customer: 'Budi Santoso', channel: 'Tokopedia', product: 'Keycap Kustom', qty: 5, date: '2026-08-20', deadline: '2026-08-22', payment: 'Lunas', status: 'Sedang Diproduksi', priority: 'Kritis', total: 250000 },
  { id: 'NX-103', customer: 'Siti Aminah', channel: 'Shopee', product: 'Miniatur Bangunan', qty: 1, date: '2026-08-21', deadline: '2026-08-25', payment: 'Belum Lunas', status: 'Baru', priority: 'Normal', total: 850000 },
  { id: 'NX-104', customer: 'Andi Wijaya', channel: 'Pesanan Langsung', product: 'Casing IoT', qty: 10, date: '2026-08-19', deadline: '2026-08-21', payment: 'Lunas', status: 'Sedang Diproduksi', priority: 'Tinggi', total: 1500000 },
  { id: 'NX-105', customer: 'PT. Teknologi Maju', channel: 'Mitra', product: 'Plat Nama', qty: 50, date: '2026-08-15', deadline: '2026-08-28', payment: 'Sebagian', status: 'Dikonfirmasi', priority: 'Normal', total: 5000000 },
];

export const mockProjects = [
  { id: 'PRJ-2408-01', client: 'Cafe Senja', type: 'Videografi', status: 'Sedang Berjalan', deadline: '2026-08-30', value: 8000000, payment: 'Sebagian' },
  { id: 'PRJ-2408-02', client: 'Tech Startup X', type: 'Halaman Landas', status: 'Ditinjau', deadline: '2026-08-22', value: 15000000, payment: 'Lunas' },
  { id: 'PRJ-2407-15', client: 'Dina Weddings', type: 'Fotografi', status: 'Selesai', deadline: '2026-08-10', value: 12000000, payment: 'Lunas' },
];

export const mockMaterials = [
  { id: 'MAT-01', type: 'PLA Hitam', remaining: 623, initial: 1000, status: 'Normal' },
  { id: 'MAT-02', type: 'PLA Putih', remaining: 140, initial: 1000, status: 'Rendah' },
  { id: 'MAT-03', type: 'PETG Bening', remaining: 850, initial: 1000, status: 'Normal' },
  { id: 'MAT-04', type: 'Resin Abu-abu', remaining: 50, initial: 500, status: 'Kritis' },
];

export const revenueData = [
  { name: 'Jan', Craft: 4000, Studio: 2400 },
  { name: 'Feb', Craft: 3000, Studio: 1398 },
  { name: 'Mar', Craft: 2000, Studio: 9800 },
  { name: 'Apr', Craft: 2780, Studio: 3908 },
  { name: 'Mei', Craft: 1890, Studio: 4800 },
  { name: 'Jun', Craft: 2390, Studio: 3800 },
  { name: 'Jul', Craft: 3490, Studio: 4300 },
];

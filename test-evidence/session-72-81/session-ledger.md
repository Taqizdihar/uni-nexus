# Session 72-81 QA Ledger

Account yang digunakan untuk seluruh kasus: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.

## UNX-S05-011 — worksheet row 72
- Use Case: Uni-Inside Craft — Produk — Versi/Aktivasi BOM, Costing, dan Status Kesiapan
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S05-011/01-bom-v2-prerequisites-missing.png`
- Observation: Produk uji dan halaman BOM dapat dibuka, tetapi ringkasan menunjukkan BOM dan profil cetak belum tersedia. Pada form Tambah BOM Material, pemilih material hanya menyediakan `Pilih material` tanpa material aktif Craft. Karena material utama/sekunder dan prasyarat profil cetak tidak tersedia, BOM v2, aktivasi, pemeriksaan stok, dan status kesiapan tidak dapat diselesaikan sesuai langkah.

## UNX-S05-012 — worksheet row 73
- Use Case: Uni-Inside Craft — Produk — Versi/Aktivasi BOM, Costing, dan Status Kesiapan
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S05-012/01-no-active-bom-costing.png`
- Observation: Halaman costing produk dapat dibuka dan terlihat `Belum ada BOM aktif`; biaya efektif dan saran harga tampil, tetapi pembanding BOM aktif/fallback yang diwajibkan tidak tersedia. Karena BOM aktif dan data material prasyarat belum ada, formula costing, pembulatan, margin, serta verifikasi aktivasi tidak dapat diselesaikan lengkap.

## UNX-S05-013 — worksheet row 74
- Use Case: Uni-Inside Craft — Printer — Master, Search, Filter, Archive
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S05-013/02-printer-list-search-filter.png`
- Observation: Printer utama dan printer sekunder berhasil dibuat melalui UI; kode dan nomor seri duplikat ditolak dengan pesan yang terlihat, pencarian kode/nama/brand/model, filter status, dan empty state pencarian juga bekerja. Namun pada uji nilai numerik tidak valid (nozzle/dimensi nol atau negatif dan biaya negatif), form tidak menampilkan validasi batas numerik yang jelas dan terlihat pesan lama `Nama printer wajib diisi.`. Expected Result yang mewajibkan penolakan/validasi nilai numerik tidak terpenuhi secara dapat dibuktikan.

## UNX-S05-014 — worksheet row 75
- Use Case: Uni-Inside Craft — Printer — Detail, Lifecycle, Archive, dan History
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S05-014/01-main-detail-metrics.png`; `test-evidence/session-72-81/UNX-S05-014/02-archive-cancel-confirm-reactivate.png`
- Observation: Detail printer utama, metrik nol, edit metadata, perubahan Offline/Tersedia, halaman aktivitas, dan halaman riwayat berhasil diverifikasi. Printer sekunder dapat diarsipkan setelah pembatalan konfirmasi. Namun setelah arsip dikonfirmasi, tidak ada filter/daftar arsip yang dapat digunakan untuk mengaktifkan kembali printer; membuka URL detail lama lalu menekan aktivasi tidak mengembalikan printer ke daftar aktif. Expected Result untuk archive lalu reaktivasi tidak terpenuhi lengkap.

## UNX-S05-015 — worksheet row 76
- Use Case: Uni-Inside Craft — Printer — Preventive Maintenance Schedule & History
- Result: Pass.
- Evidence: `test-evidence/session-72-81/UNX-S05-015/01-maintenance-schedule-calendar-history.png`; `test-evidence/session-72-81/UNX-S05-015/02-maintenance-completed-history-after-delete.png`
- Observation: Validasi form kosong terlihat, jadwal berbasis tanggal dan jam cetak berhasil dibuat, diedit, dinonaktifkan/diaktifkan, sinkron dengan kalender, maintenance dimulai/diselesaikan, dan riwayat tampil. Jadwal alternatif dihapus setelah konfirmasi dan entri riwayat tetap ada.

## UNX-S06-001 — worksheet row 77
- Use Case: Uni-Inside Craft — Printer Issues — Create, Severity, Assignment, dan Filter
- Result: Pass.
- Evidence: `test-evidence/session-72-81/UNX-S06-001/01-high-low-issues-filters-open.png`
- Observation: Submit kosong menampilkan validasi. Issue LOW tanpa assignee dan HIGH dengan assignee QA User-1 berhasil dibuat; issue HIGH membuat printer terlihat Bermasalah, dan filter severity/status menampilkan issue yang sesuai. Alur lengkap kasus berhasil diamati pada UI dengan ACCOUNT #1 — Insinyur 3D.

## UNX-S06-002 — worksheet row 78
- Use Case: Uni-Inside Craft — Printer Issues — Lifecycle, Resolution, dan Recovery
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S06-002/02-printer-remains-problematic-after-resolve.png`
- Observation: Issue HIGH dan LOW berhasil dipindahkan ke Investigasi, catatan penyelesaian diwajibkan sebelum simpan, lalu keduanya berhasil diselesaikan dan riwayat resolusi terlihat. Namun setelah semua issue open diselesaikan dan halaman dimuat ulang, kartu printer tetap berstatus `Bermasalah`, bukan `Tersedia`, tanpa job fisik aktif. Expected Result pemulihan status printer setelah seluruh issue selesai tidak terpenuhi.

## UNX-S06-003 — worksheet row 79
- Use Case: Uni-Inside Craft — Procurement Dashboard — Summary, Low Stock, dan Cross Navigation
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S06-003/01-procurement-empty-summary-and-low-stock.png`; `test-evidence/session-72-81/UNX-S06-003/02-procurement-summary-empty-navigation.png`
- Observation: Ringkasan pengadaan dan halaman Stok Menipis dapat dibuka tanpa exception, tetapi seluruh metrik bernilai 0/Rp0, halaman low stock menyatakan semua stok aman, dan tidak ada material utama. Form permintaan/pesanan hanya menyediakan item non-material serta tidak menyediakan supplier/material uji. Expected Result stok 800, threshold 850, low-stock badge, serta cross navigation material tidak dapat dipenuhi.

## UNX-S06-004 — worksheet row 80
- Use Case: Uni-Inside Craft — Supplier — Master, Party Reuse, Duplicate, dan Search
- Result: Pass.
- Evidence: `test-evidence/session-72-81/UNX-S06-004/01-supplier-created-duplicate-reuse-search.png`
- Observation: Form kosong dan input invalid menahan penyimpanan tanpa membuat record. Supplier valid berhasil dibuat dan detailnya terlihat. Identitas yang sama dapat memakai Party yang sudah ada tanpa duplikasi; NPWP yang sama tanpa konfirmasi ditolak dengan pesan yang terlihat. Pencarian kode, nama, email, telepon, dan empty state pencarian acak berfungsi.

## UNX-S06-005 — worksheet row 81
- Use Case: Uni-Inside Craft — Supplier — Detail, Kontak, Material Preference, dan PO Summary
- Result: Bug/Failed.
- Evidence: `test-evidence/session-72-81/UNX-S06-005/01-supplier-detail-zero-metrics.png`; `test-evidence/session-72-81/UNX-S06-005/02-contact-primary-and-no-material-related.png`
- Observation: Detail supplier, edit legal name/alamat, metrik PO nol, dan ringkasan kosong berhasil terlihat. Dua kontak berhasil ditambahkan; setelah kontak kedua ditandai utama, UI menampilkan hanya kontak kedua sebagai `UTAMA`. Namun kartu kontak tidak menyediakan kontrol WhatsApp, catatan, edit, atau hapus yang diwajibkan, dan bagian Material Terkait menampilkan `Belum ada material terkait`, sehingga pemilihan preferred supplier/material dan verifikasi PO tidak dapat dilakukan. Requirement kasus tidak terpenuhi lengkap karena fitur/kondisi prasyarat tersebut tidak tersedia pada UI.

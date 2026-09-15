# Session 82-91 QA Ledger

Account yang digunakan: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft. Role/User workbook untuk seluruh kasus adalah `@ahmadropaldo / ENGINEER_3D + craft.procurement.read/write + craft.materials.read + akses CRAFT`.

## UNX-S06-006 — worksheet row 82
- Use Case: Uni-Inside Craft — Pengadaan — Nonaktif/Aktif Pemasok dan Pembatasan Pemilihan
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-006/01-no-secondary-active-supplier-po-form.png`
- Observation: Daftar Pemasok hanya menampilkan QA Supplier Primary SUP-000020; pemasok sekunder/reuse aktif yang menjadi target tidak tersedia. Form PO baru hanya menyediakan QA Supplier Primary. Karena target sekunder dan data PO/tagihan pembanding tidak tersedia, alur batal/konfirmasi nonaktif, reaktivasi, pemeriksaan Party role lain, serta penolakan karena workflow terbuka tidak dapat dijalankan literal tanpa memakai pemasok yang salah.

## UNX-S06-007 — worksheet row 83
- Use Case: Uni-Inside Craft — Pengadaan — Permintaan Pembelian dari Low Stock, Multi-Item, Validasi, dan Draf
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-007/01-no-material-low-stock-or-prerequisite.png`
- Observation: Form Permintaan Pembelian dapat dibuka, tetapi tidak ada material QA atau jalur Low Stock dengan material. Dropdown hanya berisi Item non-material dan satuan yang tersedia bukan Gram/G; penyimpanan kosong hanya mempertahankan form tanpa membuat PR. Quantity 200 G, estimated price 150, multi-item, total 130.000, dan validasi material tidak dapat diuji karena prasyarat material 800 G/reorder 200 G tidak tersedia.

## UNX-S06-008 — worksheet row 84
- Use Case: Uni-Inside Craft — Pengadaan — Workflow PR: Ajukan, Setujui/Tolak, Audit, dan Read-Only
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-008/01-no-prerequisite-pr-list.png`
- Observation: Daftar Permintaan Pembelian menampilkan Belum Ada Permintaan Pembelian. PR utama Draft dan PR sekunder untuk skenario penolakan tidak tersedia, sehingga transisi Draft→Submitted→Approved/Rejected, dialog batal, alasan penolakan, audit, tombol Buat PO, dan kontrol lifecycle Draft tidak dapat diverifikasi lengkap.

## UNX-S06-009 — worksheet row 85
- Use Case: Uni-Inside Craft — Pengadaan — PO Parsial dari PR, Mapping Item, Batas Sisa, dan Kalkulasi
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-009/01-no-approved-pr-or-po.png`
- Observation: Halaman Pesanan Pembelian menampilkan Belum Ada Pesanan Pembelian. PR Approved dengan sisa item material/non-material dan fondasi supplier/material tidak tersedia, sehingga pembuatan PO parsial, batas remaining quantity, mapping item, subtotal 65.000, total 80.000, dan pembaruan PR tidak dapat dijalankan.

## UNX-S06-010 — worksheet row 86
- Use Case: Uni-Inside Craft — Pengadaan — Penyelesaian Mapping PR dan PO Pembelian Langsung
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-010/01-no-pr-remaining-and-direct-po-form.png`
- Observation: Tidak ada PR dengan sisa 100 G dan 1 PCS. Form PO langsung hanya menampilkan QA Supplier Primary dan pilihan item Non-material tanpa material aktif; karena itu PO kedua, status PR ORDERED, perlindungan over-order, serta PO langsung final tidak dapat diselesaikan sesuai langkah.

## UNX-S06-011 — worksheet row 87
- Use Case: Uni-Inside Craft — Pengadaan — Lifecycle PO, PDF, Konfirmasi, Pembatalan, dan Kontrol Status
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-011/01-po-lifecycle-no-orders.png`
- Observation: Tidak ada PO Draft yang dapat dibuka. Percobaan menyimpan form PO kosong mempertahankan form dan fokus pada pemasok wajib tanpa membuat PO. Karena tidak ada PO sumber, PDF, Send, Confirm, Cancel, audit transisi, kontrol receipt, dan verifikasi Document Center tidak dapat dilakukan.

## UNX-S06-012 — worksheet row 88
- Use Case: Uni-Inside Craft — Pengadaan — Penerimaan Parsial, Barang Ditolak, Batch/Spool, dan Stock-In
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-012/01-no-receivable-po.png`
- Observation: Form Terima Barang terbuka, tetapi dropdown PO hanya berisi Pilih PO dapat diterima dan tombol Simpan Penerimaan disabled. Tidak ada PO Sent/Confirmed, sehingga accepted/rejected quantity, alasan penolakan, batch, spool, stock-in, movement, dan status Partial tidak dapat diuji.

## UNX-S06-013 — worksheet row 89
- Use Case: Uni-Inside Craft — Pengadaan — Over-Receipt, Penerimaan Lanjutan, Penyelesaian PO, dan Rollback
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-013/01-no-partial-po-or-receipts.png`
- Observation: Daftar Penerimaan Barang menampilkan Belum Ada Penerimaan Barang. PO Partial/Confirmed, saldo stok 860 G, receipt pertama, dan remaining 40 G tidak tersedia. Karena itu penolakan over-receipt, penerimaan lanjutan, rollback, penyelesaian PO, pembatasan PO Received, dan rekonsiliasi 1.000 G tidak dapat dijalankan.

## UNX-S06-014 — worksheet row 90
- Use Case: Uni-Inside Craft — Pengadaan — Tagihan Pemasok, Accounts Payable, Duplikasi, Void, dan Dokumen
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-014/01-invoice-empty-and-fields.png`
- Observation: Halaman Tagihan Pemasok menampilkan Belum Ada Tagihan Pemasok. Modal menyediakan pemasok QA Supplier Primary, nomor, tanggal, jatuh tempo, dan total; submit kosong mempertahankan form tanpa invoice. Invoice QA-INV-0601/open invoice, duplicate/void, AP, blokir deaktivasi supplier, dan verifikasi PO/notes/dokumen tidak dapat diselesaikan karena data sumber tidak tersedia.

## UNX-S06-015 — worksheet row 91
- Use Case: Uni-Inside Craft — Pengadaan — Rekonsiliasi Ringkasan, Kinerja Pemasok, Riwayat, dan Filter URL
- Result: Bug/Failed.
- Evidence: `test-evidence/session-82-91/UNX-S06-015/01-procurement-summary-empty.png`; `test-evidence/session-82-91/UNX-S06-015/02-orders-query-received-empty.png`; `test-evidence/session-82-91/UNX-S06-015/03-procurement-history-limited-controls.png`; `test-evidence/session-82-91/UNX-S06-015/04-supplier-performance-zero-and-history.png`
- Observation: Ringkasan Pengadaan menampilkan seluruh KPI 0/Rp0, material stok menipis 0, dan tidak ada exception. URL daftar requests rejected serta orders received menampilkan empty state. Riwayat hanya memuat event pembuatan/pembaruan supplier dan dua kontak; detail supplier menunjukkan Total PO 0, PO terbuka 0, PO diterima 0, nilai Rp0, tanpa material/PO terkait. Dataset PR/PO/receipt/invoice dan rekonsiliasi sesi tidak tersedia, sehingga Expected Result tidak terpenuhi.

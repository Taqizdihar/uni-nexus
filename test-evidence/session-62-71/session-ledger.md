# Session 62-71 QA Ledger

## UNX-S05-001 — worksheet row 62
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-001/01-global-category-sync.png`
- Observation: Kategori `QA Filament` berhasil dibuat dengan kode `MATCAT-000003`, tipe filament, diganti nama menjadi `QA Filament Utama`, dinonaktifkan/diaktifkan kembali, tidak ditawarkan pada form material saat nonaktif, dan terlihat sama di Data Master setelah reload. Namun pada Data Master untuk akun yang diwajibkan tidak tersedia kontrol rename/mutasi, sehingga arah sinkronisasi balik dari Data Master tidak dapat dijalankan secara lengkap.

## UNX-S05-002 — worksheet row 63
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-002/01-material-prerequisite-failure.png`
- Observation: Form Tambah Material dapat dibuka dan penekanan Simpan tanpa Nama menampilkan validasi nama/kategori/satuan. Namun prasyarat tidak terpenuhi: pilihan satuan aktif hanya `Satuan QA Edit 163552 (qe)`, bukan Gram/G, dan pemilih Pemasok Pilihan hanya berisi `Belum dipilih` tanpa pemasok aktif. Material utama/sekunder tidak dibuat karena data uji wajib tidak tersedia; langkah validasi numerik, warna, SKU, dan duplikasi tidak dapat dilanjutkan secara sah.

## UNX-S05-003 — worksheet row 64
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-003/01-material-inventory-prerequisite-empty.png`
- Observation: Tab Filament, Resin, Hardware, Kemasan, Consumable, dan Lainnya dapat dibuka dan menampilkan empty state; pencarian acak juga tidak menemukan data. Prasyarat material utama dan sekunder aktif tanpa stok tidak tersedia karena UNX-S05-002 gagal menemukan satuan Gram/G dan pemasok aktif. Kartu stok, pencarian SKU/nama/brand/jenis/warna, edit master, dan uji nonaktif material tidak dapat diverifikasi lengkap.

## UNX-S05-004 — worksheet row 65
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-004/01-no-material-detail-or-archive.png`
- Observation: Inventaris Filament menampilkan `Belum Ada Filament`, sehingga detail material utama dan material sekunder tidak tersedia. Akibatnya ringkasan stok/batch/spool/movement, edit nilai, uji SKU duplikat, arsip-batal/konfirmasi, serta jalur aktivasi ulang tidak dapat dijalankan lengkap. Prasyarat dua material yang ditentukan tidak terpenuhi.

## UNX-S05-005 — worksheet row 66
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-005/01-receipt-no-material-picker.png`
- Observation: Dialog Terima Stok dapat dibuka, tetapi pemilih material hanya menampilkan `Pilih material...` yang disabled dan tidak ada material aktif untuk dipilih. Karena material utama Filament bersatuan G dan pemasok/prasyarat material tidak tersedia, penerimaan 1.000 G tidak dapat dilakukan; batch, spool, nilai, dan movement tidak terbentuk sehingga Expected Result tidak terpenuhi.

## UNX-S05-006 — worksheet row 67
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-006/01-no-material-movement.png`
- Observation: Halaman Pergerakan Stok terbuka dan menampilkan `Belum Ada Pergerakan Stok`. Tidak ada detail material, batch 1.000 G, atau spool sebagai prasyarat, sehingga menu Sesuaikan Stok dan uji adjustment keluar/masuk, validasi saldo, reason default, serta perlindungan saldo tidak dapat dijalankan. Saldo akhir 975 G tidak dapat diverifikasi.

## UNX-S05-007 — worksheet row 68
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-007/01-no-spool-prerequisite.png`
- Observation: Halaman Spool Filament terbuka dan menampilkan `Belum Ada Spool Filament` dengan keterangan spool dibuat saat penerimaan stok. Spool QA berbobot 975 G dan batch terkait tidak tersedia karena penerimaan pada UNX-S05-005 tidak dapat dilakukan; timbang ulang, lokasi, opened, dried, dan movement -75 tidak dapat diuji.

## UNX-S05-008 — worksheet row 69
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-008/01-waste-no-material-validation.png`
- Observation: Form Catat Limbah Manual menampilkan field Material, Batch, Jumlah, Alasan, dan Catatan, serta pilihan alasan yang diminta. Namun Material hanya memiliki `Pilih material…`, Batch disabled, dan submit kosong menampilkan `Material, batch, dan jumlah limbah wajib valid.`. Material/batch QA 900 G tidak tersedia, sehingga waste 100 G, rollback saldo 800 G, movement waste, dan penolakan over-balance tidak dapat diselesaikan.

## UNX-S05-009 — worksheet row 70
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-009/01-low-stock-no-material.png`
- Observation: Halaman Stok Menipis menampilkan `Semua Stok Dalam Kondisi Aman` dan tidak menampilkan material utama. Prasyarat Available 800 G, threshold 850 G, reorder 200 G, serta bukti material stok nol tidak tersedia karena material utama/sekunder belum berhasil dibuat. Badge low stock, tautan pengadaan dengan query material, perubahan threshold/reorder, dan pengecualian material nonaktif tidak dapat diverifikasi.

## UNX-S05-010 — worksheet row 71
- Account: ACCOUNT #1 — Insinyur 3D; workspace Uni-Inside Craft.
- Result: Bug/Failed.
- Evidence: `UNX-S05-010/01-bom-material-picker-empty.png`; `UNX-S05-010/02-product-prerequisite-missing-print-profile.png`
- Observation: Produk QA aktif dan desain 3D tersedia, tetapi Ringkasan terlihat menyatakan `Profil cetak tersedia –` dan `Profil cetak belum tersedia`. Pada tab BOM / Material, form Tambah BOM tersedia tetapi pemilih Material hanya berisi `Pilih material`, tanpa material aktif Craft untuk dipilih. Karena prasyarat print profile dan material utama G dengan saldo 800/0/800 tidak terpenuhi, BOM valid v1, validasi material, pemeriksaan multi-item, dan verifikasi stok tidak dapat diselesaikan.

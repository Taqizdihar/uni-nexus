Baik. Saya sudah menganalisis ulang struktur **repository Taqizdihar/uni-nexus pada branch main**, terutama Sidebar.tsx, App.tsx, serta direktori halaman Global, Craft, dan Studio. Dari struktur saat ini, UNI-NEXUS memang dapat dipahami sebagai **tiga lapisan besar**: modul Global yang dipakai bersama, workspace Uni-Inside Craft, dan workspace Uni-Inside Studio. Sidebar Craft dan Studio berganti mengikuti workspace, sedangkan fitur global tetap tersedia di keduanya.

Saya juga membedakan antara modul yang sekarang sudah memiliki halaman frontend khusus dan modul yang masih berstatus **Tahap Berikutnya, Lanjutan, Belum Terkonfigurasi, atau masih jatuh ke halaman “Dalam Pengembangan”**. Di repository sekarang, Craft sudah memiliki halaman khusus untuk Pesanan, Produksi, Produk, Printer, Material, Keuangan/Kalkulator, serta Pelanggan; Studio baru memiliki halaman khusus untuk Proyek, Klien, dan Layanan.

Berikut gambaran seluruh modul dengan bahasa yang lebih sederhana.

A. Modul Global — berlaku untuk Craft dan Studio
------------------------------------------------

1.  **Dasbor Global** — halaman utama setelah login yang berfungsi sebagai “pusat pandang” UNI-NEXUS. Nantinya di sinilah pengguna melihat kondisi keseluruhan Uni-Inside: total kas, pendapatan kotor, pendapatan bersih, pengeluaran, aktivitas Craft, aktivitas Studio, kondisi produksi, dan informasi penting lainnya. Dashboard ini **tidak berubah ketika workspace Craft/Studio diganti**, karena datanya bersifat gabungan. Saat ini sudah memiliki halaman frontend khusus.
    
2.  **Keuangan Terpadu** — menggabungkan keuangan Uni-Inside Craft dan Uni-Inside Studio dalam satu tempat. Misalnya Craft memperoleh Rp2 juta dan Studio Rp5 juta, modul ini menjadi tempat untuk melihat kondisi keuangan Uni-Inside secara keseluruhan, termasuk kas, pendapatan, pengeluaran, arus kas, laba-rugi, dan transfer internal antardivisi. **Status sekarang: Tahap Berikutnya.**
    
3.  **Pusat Dokumen** — tempat terpusat untuk menyimpan, mencari, melihat, mencetak, dan mengunduh dokumen operasional. Nantinya dapat mencakup invoice, quotation, bukti pembayaran, laporan keuangan, purchase order, kuitansi, dan dokumen lainnya. **Status sekarang: Lanjutan.**
    
4.  **Kalender & Tugas** — menyatukan jadwal dan pekerjaan dari berbagai modul. Contohnya deadline pesanan Craft, jadwal produksi, maintenance printer, deadline proyek Studio, jatuh tempo invoice, maupun tugas anggota tim. Menu ini sudah ada di sidebar, tetapi belum mempunyai route halaman khusus sehingga saat ini masih masuk ke halaman pengembangan umum.
    
5.  **Notifikasi** — menjadi pusat pemberitahuan UNI-NEXUS. Contohnya “Filament hitam hampir habis”, “Pesanan dengan prioritas kritis masuk”, “Print selesai”, “Invoice jatuh tempo”, atau “Proyek mendekati deadline”. **Status sekarang: Tahap Berikutnya.**
    
6.  **Manajemen Pengguna** — mengelola seluruh akun internal UNI-NEXUS. CEO, COO, dan CTO dapat menyetujui atau menolak permintaan akun, memberikan role, menangguhkan akun, mengaktifkan kembali akun, serta mengelola pengguna lainnya. Sidebar menampilkan modul ini berdasarkan permission users.manage, dan backend juga melindungi seluruh endpoint /users dengan permission tersebut, jadi bukan sekadar menyembunyikan menu di frontend. **Status sekarang: sudah dikembangkan dan berfungsi.**
    
7.  **Log Audit** — seperti “rekaman aktivitas” sistem. Modul ini nantinya mencatat siapa melakukan apa dan kapan. Contoh: “CTO mengubah role pengguna”, “Operator mengubah prioritas pesanan”, “Insinyur 3D menyelesaikan print”, atau “COO mengubah transaksi”. Sangat berguna untuk transparansi dan troubleshooting. **Status sekarang: Lanjutan.**
    
8.  **Integrasi** — tempat menghubungkan UNI-NEXUS dengan layanan eksternal seperti Google Drive, Google Sheets, Google Calendar, WhatsApp, marketplace, payment provider, atau API lain. Tujuannya agar UNI-NEXUS tidak bekerja sebagai sistem yang sepenuhnya terisolasi. Menu sudah ada tetapi halaman khususnya belum dibuat.
    
9.  **Pusat Otomasi** — tempat mengelola otomasi yang berlaku secara global. Misalnya: “Jika stok filament < 200 gram → buat notifikasi”, “Jika invoice lewat jatuh tempo → beri peringatan”, atau “Jika pesanan deadline <24 jam → ubah menjadi prioritas kritis”. Menu sudah ada tetapi halaman khususnya belum dibuat.
    
10.  **Pusat Laporan** — tempat menghasilkan laporan dari berbagai bagian UNI-NEXUS. Nantinya dapat berisi laporan Craft, Studio, keuangan gabungan, laporan produksi, laporan penjualan, hingga export PDF/XLSX/CSV. Menu sudah ada tetapi saat ini belum mempunyai implementasi halaman khusus.
    
11.  **Data Master** — tempat menyimpan data referensi yang digunakan berulang kali di seluruh sistem. Contohnya kategori transaksi, kategori pengeluaran, metode pembayaran, marketplace, jenis material, kategori produk, kategori layanan, serta satuan seperti gram, kilogram, pcs, dan jam. Ini penting agar data tidak di-hardcode di setiap modul.
    
12.  **Pengaturan** — mengatur konfigurasi umum UNI-NEXUS, misalnya informasi organisasi, pengaturan Craft, Studio, keuangan, dokumen, notifikasi, dan integrasi. **Status sekarang: Tahap Berikutnya.**
    
13.  **Profil Saya** — bukan modul operasional utama di sidebar, tetapi merupakan fungsi global untuk masing-masing pengguna. Pengguna dapat mengubah nama, username, email, nomor telepon, foto profil, workspace default, serta kata sandinya sendiri. Halamannya sudah tersedia di source code.
    

B. Workspace Uni-Inside Craft
=============================

Ini adalah bagian yang paling penting untuk pengembangan tahap berikutnya karena berhubungan langsung dengan operasional 3D printing.

1.  **Pesanan** — pusat seluruh pesanan produk Craft, apa pun sumbernya. Tujuan terbesarnya adalah supaya pesanan dari Shopee, TikTok Shop, Tokopedia, direct order, dan startup mitra tidak lagi tersebar dan membingungkan. Modul ini nantinya menentukan **apa yang dipesan, siapa pelanggan, kapan deadline, dari kanal mana, sudah dibayar atau belum, serta pesanan mana yang harus dikerjakan lebih dahulu**. Struktur submenu saat ini adalah **Semua Pesanan, Pesanan Baru, Prioritas Produksi, Antrean Produksi, Pesanan Custom, Pesanan Mitra, Pesanan Selesai, serta Dibatalkan/Dikembalikan**.**Status:** sudah memiliki halaman khusus dan menjadi modul yang paling tepat kita kembangkan pertama kali.
    
2.  **Produksi** — mengubah pesanan menjadi pekerjaan produksi nyata. Jika Pesanan menjawab “apa yang harus dibuat?”, Produksi menjawab **“bagaimana dan kapan barang itu sedang dibuat?”**. Di sini nantinya bisa diketahui pekerjaan yang masih menunggu, siap dicetak, sedang dicetak, masuk QC, selesai, atau gagal. Submenu saat ini: **Papan Produksi, Produksi Aktif, Antrean Cetak, Pekerjaan Cetak, Cetak Gagal, Kontrol Kualitas, Kalender Produksi**.
    
3.  **Produk & Desain** — menyimpan “master produk” yang bisa dijual/diproduksi oleh Craft. Misalnya Custom Keycap, casing IoT, miniatur gedung, figurine, nameplate, dan produk lainnya. Selain informasi produk, modul ini juga bisa menyimpan file desain 3D, profil cetak, material yang dibutuhkan, estimasi gram filament, serta biaya/harga jual. Submenu sekarang: **Katalog Produk, Pustaka Desain 3D, Profil Cetak, Biaya & Penetapan Harga**.
    
4.  **Printer** — mengelola seluruh printer 3D. Saat ini Craft memiliki satu printer, tetapi arsitekturnya disiapkan agar nantinya printer baru bisa ditambahkan. Modul ini nantinya mengetahui printer **tersedia, sedang digunakan, maintenance, error, atau offline**, pekerjaan yang sedang dicetak, riwayat penggunaannya, jadwal maintenance, dan masalah printer. Submenu: **Daftar Printer, Aktivitas Saat Ini, Riwayat Cetak, Perawatan, Masalah Printer**.
    
5.  **Material** — mengelola seluruh bahan produksi, terutama filament. Bukan hanya “punya PLA hitam atau tidak”, tetapi juga **berapa gram tersisa, spool mana yang digunakan, berapa gram dipakai untuk print, berapa yang terbuang akibat failed print, dan kapan stok harus dibeli kembali**. Submenu: **Inventaris Filament, Spool Filament, Pergerakan Stok, Stok Menipis, Limbah Filament**.
    
6.  **Pelanggan & Mitra** — menyimpan pihak yang memesan produk dari Craft. **Pelanggan** biasanya merupakan pembeli individual/biasa, sedangkan **Mitra** dapat berupa startup atau organisasi yang bekerja sama dan berulang kali memberikan order. Nantinya riwayat pesanan, nilai transaksi, harga khusus mitra, dan informasi kontak dapat terhubung ke sini.
    
7.  **Pengadaan** — mengelola pembelian kebutuhan operasional Craft, khususnya ketika stok material atau perlengkapan perlu ditambah. Contoh alurnya: butuh filament → pilih supplier → buat pesanan pembelian → barang diterima → stok Material bertambah → pengeluaran masuk Keuangan. Sidebar sekarang menyediakan **Pemasok** dan **Pesanan Pembelian**. **Status: Tahap Berikutnya.**
    
8.  **Keuangan Craft** — mencatat seluruh uang yang khusus berkaitan dengan operasional 3D printing: pendapatan penjualan, pengeluaran, transaksi, biaya produksi/HPP, cash flow, hingga biaya marketplace. Salah satu fungsi terpentingnya adalah menghitung biaya produk berdasarkan **gram filament + listrik + packaging + komponen + fee marketplace + biaya tambahan**, sehingga penentuan harga tidak lagi sekadar perkiraan. Submenu saat ini: **Ringkasan Keuangan, Transaksi, Kalkulator Biaya Produk, Arus Kas**. Halaman Finance dan Calculator sudah terdapat di source code.
    
9.  **Laporan & Analitik Craft** — mengubah data operasional Craft menjadi informasi yang mudah dianalisis. Misalnya produk terlaris, omzet per marketplace, jumlah order per bulan, persentase failed print, penggunaan filament, utilisasi printer, margin produk, dan profitabilitas. **Status sekarang: Lanjutan.**
    
10.  **Marketplace & Kanal Penjualan** — menjadi penghubung antara UNI-NEXUS dan sumber pesanan seperti Shopee, TikTok Shop, Tokopedia, Direct Order, dan Partner Order. Tujuan jangka panjangnya agar pesanan tidak perlu dimasukkan manual satu per satu jika API marketplace sudah tersedia. **Status sekarang: Belum Terkonfigurasi**, karena integrasi real memerlukan API/credential eksternal.
    
11.  **Otomasi Craft** — melakukan pekerjaan rutin Craft secara otomatis. Contoh: pesanan mendekati deadline otomatis naik prioritas, stok material rendah membuat notifikasi, print selesai mengubah status printer, atau order baru otomatis dimasukkan ke antrean produksi. **Status sekarang: Lanjutan.**
    

C. Workspace Uni-Inside Studio
==============================

Workspace ini mengelola bisnis jasa Uni-Inside Studio secara umum, bukan produksi barang 3D.

1.  **Proyek** — pusat pekerjaan jasa Studio. Misalnya proyek fotografi, videografi, editing, desain grafis, pengembangan landing page, marketing, atau dokumentasi acara. Modul ini digunakan untuk mengetahui **proyek milik klien siapa, statusnya apa, deadline kapan, progres bagaimana, dan apa saja hasil yang harus diserahkan**. Submenu sekarang: **Semua Proyek, Proyek Aktif, Proyek Baru, Tahapan Proyek**. Halaman khususnya sudah tersedia.
    
2.  **Klien** — menyimpan seluruh klien Uni-Inside Studio beserta informasi kontak, perusahaan, riwayat proyek, nilai proyek, invoice, dan hubungan bisnis mereka. Sederhananya, ini adalah “buku pelanggan” khusus bisnis jasa Studio. Halaman khusus sudah tersedia.
    
3.  **Layanan** — menjadi katalog layanan yang dapat ditawarkan Studio. Contohnya Fotografi, Videografi, Editing Video, Desain Grafis, Landing Page Development, Marketing, Media Sosial, atau Dokumentasi Acara. Setiap layanan nantinya dapat mempunyai harga dasar, paket, dan informasi lainnya. Halaman khusus sudah tersedia.
    
4.  **Peralatan & Aset** — mengelola aset yang digunakan untuk proyek Studio, seperti kamera, lensa, lighting, microphone, tripod, laptop, dan perangkat lainnya. Bisa menjawab pertanyaan seperti “kamera ini sedang dipakai proyek mana?”, “kapan terakhir maintenance?”, atau “berapa nilai aset yang dimiliki?”. **Status: Tahap Berikutnya.**
    
5.  **Penawaran & Penagihan** — menangani proses komersial sebelum dan sesudah proyek. Sebelum proyek dimulai dapat dibuat **quotation/penawaran**, sedangkan setelah pekerjaan berjalan dapat dibuat **invoice dan jadwal pembayaran**. Submenu saat ini: **Penawaran, Invoice, Tagihan Belum Dibayar**. **Status: Tahap Berikutnya.**
    
6.  **Vendor / Freelancer / Mitra** — mengelola pihak luar yang membantu proyek Studio. Misalnya fotografer freelance, videografer tambahan, talent, vendor printing, penyewa alat, atau partner lainnya. Nantinya bisa diketahui siapa pernah bekerja pada proyek tertentu dan berapa biaya yang dibayarkan. **Status: Tahap Berikutnya.**
    
7.  **Keuangan Studio** — mengelola pendapatan dan pengeluaran yang berasal dari jasa Studio. Contohnya pendapatan proyek, biaya freelancer, transportasi, sewa alat, konsumsi, atau pembelian aset. Dari sini nantinya dapat dihitung **profit masing-masing proyek**, bukan hanya omzet. Submenu saat ini mencakup **Ringkasan Keuangan** dan **Transaksi**. **Status: Tahap Berikutnya.**
    
8.  **Laporan & Analitik Studio** — menampilkan analisis bisnis Studio seperti pendapatan per layanan, klien dengan nilai proyek terbesar, jumlah proyek, profit proyek, layanan paling sering dipesan, dan tren pendapatan. **Status: Lanjutan.**
    
9.  **Otomasi Studio** — mengotomatisasi workflow jasa. Misalnya deadline proyek mendekat → notifikasi, invoice jatuh tempo → reminder, quotation diterima → otomatis buat proyek, atau pembayaran lunas → ubah status proyek. **Status: Lanjutan.**
    

Struktur modul Craft, Studio, dan fitur Global di atas memang tercermin langsung dalam konfigurasi sidebar repository saat ini. Sementara App.tsx menunjukkan modul mana yang sudah mempunyai komponen nyata dan mana yang masih menggunakan PlannedModulePage atau catch-all **Dalam Pengembangan**.

Gambaran alur besar UNI-NEXUS
-----------------------------

Agar mudah diingat, menurut saya konsep seluruh ERP ini bisa diringkas menjadi tiga alur:

**Craft**

> Pesanan → Tentukan Prioritas → Produksi → Printer + Material → QC → Pesanan Selesai → Keuangan → Laporan

**Studio**

> Klien → Penawaran → Proyek → Pengerjaan/Deliverables → Invoice → Pembayaran → Keuangan → Laporan

**Global**

> Craft + Studio → Dasbor Global → Keuangan Terpadu → Dokumen → Notifikasi → Audit → Laporan

Jadi ketika kita mulai mengembangkan **Modul Pesanan Craft**, kita sebenarnya sedang membangun **pintu masuk utama seluruh workflow Craft**. Data yang masuk di Pesanan nantinya menjadi sumber bagi Prioritas Produksi, Produksi, Printer, Material, Pelanggan/Mitra, Keuangan, Dashboard, hingga Laporan. Karena itu, modul Pesanan memang sebaiknya kita desain dengan sangat matang terlebih dahulu sebelum bergerak ke Produksi.
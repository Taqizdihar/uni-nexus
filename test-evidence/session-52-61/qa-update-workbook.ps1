$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx'
$tempWorkbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx.qa-tmp'
$mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
$xmlNs = 'http://www.w3.org/XML/1998/namespace'
$targetRows = 52..61
$expectedStatus = @{
    52 = 'Bug/Failed'; 53 = 'Bug/Failed'; 54 = 'Pass'; 55 = 'Pass'; 56 = 'Pass'
    57 = 'Pass'; 58 = 'Pass'; 59 = 'Bug/Failed'; 60 = 'Bug/Failed'; 61 = 'Pass'
}
$notes = @{
    52 = 'Promosi periode valid menambahkan badge Mitra, tombol Kelola Kemitraan, tab Harga Mitra, dan tetap mempertahankan pelanggan aktif serta kode CUS-000015. Rentang terbalik ditolak dan Batal pada pengakhiran tidak mengubah status; pengakhiran menonaktifkan kemitraan tanpa menonaktifkan pelanggan. Namun setelah periode valid diubah dan halaman di-reload, field Mulai berlaku dan Berakhir kembali kosong, sehingga persistensi periode tidak terpenuhi. Promosi ulang tanpa periode juga ditolak; promosi ulang dengan periode valid berhasil dan fixture aktif tampil pada halaman Mitra. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    53 = 'Pelacakan dan pencarian berdasarkan kode, nama, email, telepon, WhatsApp, serta NPWP; filter jenis, hubungan, status, kombinasi, pesanan aktif, sort, halaman Mitra, kartu detail, keadaan kosong/reset, dan ekspor CSV telah dijalankan melalui UI Craft dan hasilnya terlihat sesuai. Pada langkah menonaktifkan Customer Duplicate QA (CUS-000016), data sudah berstatus Tidak Aktif sebelum tindakan dimulai sehingga tombol yang tersedia adalah Aktifkan, bukan Nonaktifkan; tindakan penonaktifan yang diwajibkan tidak dapat dilakukan tanpa mengubah prasyarat. Setelah reload, CUS-000016 tetap tampil pada filter Tidak Aktif dan file CSV terfilter berisi data CUS-000015. Karena satu langkah wajib tidak dapat dilaksanakan, hasil keseluruhan Bug/Failed. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    54 = 'Melalui Kelola Kategori Produk, dibuat kategori induk dan anak baru; kode otomatis berubah menjadi huruf besar dengan garis bawah, kode manual pada kategori anak tersimpan, duplikasi kode dibuat unik dengan sufiks _2, dan hierarki induk-anak terlihat. Nama, kode, dan induk kategori anak diedit lalu tersimpan; pilihan induk tidak memuat kategori dirinya sendiri sehingga relasi siklik dicegah. Nama kosong tidak menambah baris, nama lebih dari 120 karakter ditolak dengan pesan Data kategori tidak valid. Kategori anak dinonaktifkan, tidak muncul pada pilihan kategori di form Tambah Produk, lalu diaktifkan kembali dan muncul sebagai opsi bertingkat. Data Master menampilkan record yang sama dan status Aktif. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    55 = 'Form Tambah Produk melalui UI diuji dengan field wajib, tipe produk, kategori, deskripsi, harga, biaya, margin, berat, waktu cetak, dan gambar. Batas invalid tidak membuat row dan validasi menampilkan Data produk tidak valid. Produk utama tersimpan aktif dengan SKU otomatis PRD-000001, lalu persisten setelah reload; SKU duplikat ditolak. Produk pembanding tipe Layanan Custom berhasil dibuat lalu dinonaktifkan; produk utama tetap aktif dan ditemukan melalui pencarian katalog. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    56 = 'Katalog Craft diuji dengan keadaan awal Aktif, pencarian SKU/nama/deskripsi/varian, filter kategori/tipe/status dan kombinasi AND, refresh, keadaan kosong, reset filter, kartu readiness, serta akses detail. Hasil terlihat sesuai; pencarian Varian QA 20260914_2256 menampilkan produk utama yang memuat varian tersebut. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    57 = 'Detail produk, seluruh tab, nilai costing, readiness, riwayat kosong, edit, dan lifecycle aktif/nonaktif/aktif kembali diuji melalui UI. Produk nonaktif tidak muncul sebagai pilihan katalog atau produk pesanan baru. Unggah gambar unsupported, lebih dari 10 MB, dan file 6–10 MB yang tidak sesuai format ditolak dengan pesan UI yang sesuai; gambar valid tetap tersimpan. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    58 = 'Form varian, validasi nilai kosong/negatif/di luar batas dan JSON invalid diuji tanpa membuat row invalid. Varian QA tersimpan dengan SKU otomatis, atribut, override harga/biaya/berat/waktu, dan persisten setelah reload; varian fallback juga tersimpan dengan harga dasar. SKU duplikat ditolak. Varian QA dinonaktifkan sehingga tidak ditawarkan pada pesanan baru, kemudian diaktifkan kembali. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    59 = 'Pustaka Desain 3D diuji dari detail produk: upload valid pertama/kedua, aturan satu FINAL terbaru, filter Semua/Produk, reload, download, hapus desain non-final, serta penolakan AGENTS.md dan file STL lebih dari batas ukuran. Pada langkah submit tanpa file dan tanpa nama, row memang tidak dibuat, tetapi UI tidak menampilkan pesan wajib yang diharapkan Pilih file desain dan isi nama file; validasi yang terlihat tidak memenuhi Expected Result. Karena satu validasi wajib tidak terpenuhi, hasil keseluruhan Bug/Failed. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    60 = 'Tab Profil Cetak dan form Tambah Profil dibuka melalui detail produk; field Nama, Produk, Printer, Slicer, Nozzle, Layer height, Infill, Est. cetak, Est. material, Satuan material, Support, dan Default terlihat. Submit kosong tidak menampilkan pesan UI Nama profil wajib diisi, dan nilai invalid tidak membuat row. Pada langkah pembuatan Profil A, nilai yang diwajibkan Nozzle 0,4 dan Layer height 0,2 ditolak validasi browser dengan pesan bahwa nilai valid terdekat adalah 0 dan 1, sehingga profil yang diminta tidak dapat disimpan dan langkah default/filter/delete/readiness tidak dapat diselesaikan. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
    61 = 'Pada CUS-000015 aktif, form Harga Mitra kosong menonaktifkan Simpan Harga. Batas minimum, diskon, harga negatif, dan periode terbalik ditolak tanpa row baru; Rule A produk dasar minimum 1 diskon 10% tersimpan, duplikat aktif ditolak dengan pesan yang diwajibkan, dan Rule B varian minimum 5 harga khusus tersimpan. Rule B diedit menjadi minimum 6 dan Rp125.000 lalu persisten setelah reload. Resolver pesanan Mitra memilih harga varian Rp125.000 pada kuantitas 6, sedangkan saat Rule B di luar periode harga kembali ke Rp144.000 dari Rule A. Dialog Nonaktifkan diuji dengan Batal lalu konfirmasi; Rule B tetap tersimpan sebagai Tidak Aktif dan Rule A tetap Aktif. Akun ACCOUNT #1 — Insinyur 3D, workspace Craft.'
}

function Read-ZipEntryText($archive, $name) {
    $entry = $archive.GetEntry($name)
    if ($null -eq $entry) { throw "ZIP entry missing: $name" }
    $stream = $entry.Open()
    try {
        $reader = New-Object System.IO.StreamReader($stream, (New-Object System.Text.UTF8Encoding($false)))
        try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
    } finally { $stream.Dispose() }
}

function Get-XmlBytes($doc) {
    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
    $settings.OmitXmlDeclaration = $false
    $settings.Indent = $false
    $memory = New-Object System.IO.MemoryStream
    try {
        $writer = [System.Xml.XmlWriter]::Create($memory, $settings)
        try { $doc.Save($writer); $writer.Flush() } finally { $writer.Dispose() }
        return $memory.ToArray()
    } finally { $memory.Dispose() }
}

function Get-Docs($archive) {
    $sst = New-Object System.Xml.XmlDocument
    $sst.PreserveWhitespace = $true
    $sst.LoadXml((Read-ZipEntryText $archive 'xl/sharedStrings.xml'))
    $sheet = New-Object System.Xml.XmlDocument
    $sheet.PreserveWhitespace = $true
    $sheet.LoadXml((Read-ZipEntryText $archive 'xl/worksheets/sheet1.xml'))
    $manager = New-Object System.Xml.XmlNamespaceManager($sst.NameTable)
    $manager.AddNamespace('x', $mainNs)
    return @{ Shared = $sst; Sheet = $sheet; Ns = $manager }
}

function Get-CellValue($cell, $sharedItems) {
    if ($null -eq $cell) { return $null }
    $v = $cell.SelectSingleNode('./x:v', $sharedItems.Ns)
    $type = $cell.GetAttribute('t')
    if ($type -eq 's' -and $null -ne $v) {
        try { $index = [int]$v.InnerText.Trim() } catch { throw "Bad shared-string cell $($cell.GetAttribute('r')): v=$($v.OuterXml) inner=$($v.InnerText)" }
        $sharedNodes = $sharedItems.Shared.SelectNodes('/x:sst/x:si', $sharedItems.Ns)
        return $sharedNodes[$index].InnerText
    }
    if ($type -eq 'inlineStr') { return $cell.InnerText }
    if ($null -ne $v) { return $v.InnerText }
    return ''
}

function Get-LogicalSheet($docs) {
    $map = @{}
    foreach ($cell in $docs.Sheet.SelectNodes('//x:sheetData/x:row/x:c', $docs.Ns)) {
        $map[$cell.GetAttribute('r')] = Get-CellValue $cell $docs
    }
    return $map
}

function Get-SharedIndex($docs, $value) {
    $items = $docs.Shared.SelectNodes('/x:sst/x:si', $docs.Ns)
    for ($i = 0; $i -lt $items.Count; $i++) {
        if ($items[$i].InnerText -eq $value) { return $i }
    }
    $si = $docs.Shared.CreateElement('si', $mainNs)
    $t = $docs.Shared.CreateElement('t', $mainNs)
    [void]$t.SetAttribute('space', $xmlNs, 'preserve')
    [void]($t.InnerText = $value)
    [void]$si.AppendChild($t)
    [void]$docs.Shared.DocumentElement.AppendChild($si)
    $count = $items.Count + 1
    [void]$docs.Shared.DocumentElement.SetAttribute('uniqueCount', [string]$count)
    [void]$docs.Shared.DocumentElement.SetAttribute('count', [string]$count)
    return [int]$items.Count
}

function Set-SharedCell($docs, $address, $value) {
    $cell = $docs.Sheet.SelectSingleNode("//x:sheetData/x:row/x:c[@r='$address']", $docs.Ns)
    if ($null -eq $cell) { throw "Cell missing: $address" }
    $index = Get-SharedIndex $docs $value
    $cell.SetAttribute('t', 's')
    $v = $cell.SelectSingleNode('./x:v', $docs.Ns)
    if ($null -eq $v) {
        $v = $docs.Sheet.CreateElement('v', $mainNs)
        [void]$cell.AppendChild($v)
    }
    $v.InnerText = [string]$index
}

if (-not (Test-Path -LiteralPath $workbook)) { throw 'Workbook missing.' }
$lockStream = [System.IO.File]::Open($workbook, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
$lockStream.Dispose()
if (Test-Path -LiteralPath $tempWorkbook) { Remove-Item -LiteralPath $tempWorkbook -Force }

$sourceArchive = [System.IO.Compression.ZipFile]::OpenRead($workbook)
try {
    $beforeDocs = Get-Docs $sourceArchive
    $beforeLogical = Get-LogicalSheet $beforeDocs
    foreach ($row in $targetRows) {
        if ($beforeLogical["F$row"] -ne '' -or $beforeLogical["H$row"] -ne '') { throw "Target row already has a result: $row" }
    }
    Copy-Item -LiteralPath $workbook -Destination $tempWorkbook
} finally { $sourceArchive.Dispose() }

$updateArchive = [System.IO.Compression.ZipFile]::Open($tempWorkbook, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    $docs = Get-Docs $updateArchive
    foreach ($row in $targetRows) {
        Set-SharedCell $docs "F$row" $expectedStatus[$row]
        Set-SharedCell $docs "H$row" $notes[$row]
    }
    $sharedBytes = Get-XmlBytes $docs.Shared
    $sheetBytes = Get-XmlBytes $docs.Sheet
    foreach ($name in @('xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml')) {
        $old = $updateArchive.GetEntry($name)
        if ($null -eq $old) { throw "ZIP entry missing during write: $name" }
        $old.Delete()
    }
    $newShared = $updateArchive.CreateEntry('xl/sharedStrings.xml')
    $stream = $newShared.Open(); try { $stream.Write($sharedBytes, 0, $sharedBytes.Length) } finally { $stream.Dispose() }
    $newSheet = $updateArchive.CreateEntry('xl/worksheets/sheet1.xml')
    $stream = $newSheet.Open(); try { $stream.Write($sheetBytes, 0, $sheetBytes.Length) } finally { $stream.Dispose() }
} finally { $updateArchive.Dispose() }

$checkArchive = [System.IO.Compression.ZipFile]::OpenRead($tempWorkbook)
try {
    $afterDocs = Get-Docs $checkArchive
    $afterLogical = Get-LogicalSheet $afterDocs
    foreach ($row in $targetRows) {
        if ($afterLogical["F$row"] -ne $expectedStatus[$row]) { throw "Status validation failed: F$row" }
        if ($afterLogical["H$row"] -ne $notes[$row]) { throw "Note validation failed: H$row" }
    }
    foreach ($address in $beforeLogical.Keys) {
        if ($address -notmatch '^(F|H)(52|53|54|55|56|57|58|59|60|61)$') {
            if ($afterLogical[$address] -ne $beforeLogical[$address]) { throw "Unexpected logical cell change: $address" }
        }
    }
} finally { $checkArchive.Dispose() }

$replacementBackup = "$workbook.qa-replace-backup"
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
[System.IO.File]::Replace($tempWorkbook, $workbook, $replacementBackup, $true)
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
Write-Output 'Workbook update and pre-replacement validation succeeded.'

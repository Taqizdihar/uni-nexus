$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx'
$tempWorkbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx.qa-tmp'
$mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
$xmlNs = 'http://www.w3.org/XML/1998/namespace'
$targetRows = 72..81
$expectedStatus = @{}
$notes = @{}
$notes[72] = 'Produk uji dan halaman BOM dapat dibuka, tetapi ringkasan menunjukkan BOM dan profil cetak belum tersedia. Pada form Tambah BOM Material, pemilih material hanya menyediakan Pilih material tanpa material aktif Craft. Karena material utama/sekunder dan prasyarat profil cetak tidak tersedia, BOM v2, aktivasi, pemeriksaan stok, dan status kesiapan tidak dapat diselesaikan sesuai langkah. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S05-011/01-bom-v2-prerequisites-missing.png.'
$notes[73] = 'Halaman costing produk dapat dibuka dan terlihat Belum ada BOM aktif; biaya efektif dan saran harga tampil, tetapi pembanding BOM aktif/fallback yang diwajibkan tidak tersedia. Karena BOM aktif dan data material prasyarat belum ada, formula costing, pembulatan, margin, serta verifikasi aktivasi tidak dapat diselesaikan lengkap. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S05-012/01-no-active-bom-costing.png.'
$notes[74] = 'Printer utama dan printer sekunder berhasil dibuat melalui UI; kode dan nomor seri duplikat ditolak dengan pesan yang terlihat, pencarian kode/nama/brand/model, filter status, dan empty state pencarian juga bekerja. Namun pada uji nilai numerik tidak valid (nozzle/dimensi nol atau negatif dan biaya negatif), form tidak menampilkan validasi batas numerik yang jelas dan terlihat pesan lama Nama printer wajib diisi. Expected Result yang mewajibkan penolakan/validasi nilai numerik tidak terpenuhi secara dapat dibuktikan. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S05-013/02-printer-list-search-filter.png.'
$notes[75] = 'Detail printer utama, metrik nol, edit metadata, perubahan Offline/Tersedia, halaman aktivitas, dan halaman riwayat berhasil diverifikasi. Printer sekunder dapat diarsipkan setelah pembatalan konfirmasi. Namun setelah arsip dikonfirmasi, tidak ada filter/daftar arsip yang dapat digunakan untuk mengaktifkan kembali printer; membuka URL detail lama lalu menekan aktivasi tidak mengembalikan printer ke daftar aktif. Expected Result untuk archive lalu reaktivasi tidak terpenuhi lengkap. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S05-014/01-main-detail-metrics.png dan test-evidence/session-72-81/UNX-S05-014/02-archive-cancel-confirm-reactivate.png.'
$notes[76] = 'Validasi form kosong terlihat, jadwal berbasis tanggal dan jam cetak berhasil dibuat, diedit, dinonaktifkan/diaktifkan, sinkron dengan kalender, maintenance dimulai/diselesaikan, dan riwayat tampil. Jadwal alternatif dihapus setelah konfirmasi dan entri riwayat tetap ada. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S05-015/01-maintenance-schedule-calendar-history.png dan test-evidence/session-72-81/UNX-S05-015/02-maintenance-completed-history-after-delete.png.'
$notes[77] = 'Submit kosong menampilkan validasi. Issue LOW tanpa assignee dan HIGH dengan assignee QA User-1 berhasil dibuat; issue HIGH membuat printer terlihat Bermasalah, dan filter severity/status menampilkan issue yang sesuai. Alur lengkap kasus berhasil diamati pada UI dengan ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S06-001/01-high-low-issues-filters-open.png.'
$notes[78] = 'Issue HIGH dan LOW berhasil dipindahkan ke Investigasi, catatan penyelesaian diwajibkan sebelum simpan, lalu keduanya berhasil diselesaikan dan riwayat resolusi terlihat. Namun setelah semua issue open diselesaikan dan halaman dimuat ulang, kartu printer tetap berstatus Bermasalah, bukan Tersedia, tanpa job fisik aktif. Expected Result pemulihan status printer setelah seluruh issue selesai tidak terpenuhi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S06-002/02-printer-remains-problematic-after-resolve.png.'
$notes[79] = 'Ringkasan pengadaan dan halaman Stok Menipis dapat dibuka tanpa exception, tetapi seluruh metrik bernilai 0/Rp0, halaman low stock menyatakan semua stok aman, dan tidak ada material utama. Form permintaan/pesanan hanya menyediakan item non-material serta tidak menyediakan supplier/material uji. Expected Result stok 800, threshold 850, low-stock badge, serta cross navigation material tidak dapat dipenuhi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S06-003/01-procurement-empty-summary-and-low-stock.png dan test-evidence/session-72-81/UNX-S06-003/02-procurement-summary-empty-navigation.png.'
$notes[80] = 'Form kosong dan input invalid menahan penyimpanan tanpa membuat record. Supplier valid berhasil dibuat dan detailnya terlihat. Identitas yang sama dapat memakai Party yang sudah ada tanpa duplikasi; NPWP yang sama tanpa konfirmasi ditolak dengan pesan yang terlihat. Pencarian kode, nama, email, telepon, dan empty state pencarian acak berfungsi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S06-004/01-supplier-created-duplicate-reuse-search.png.'
$notes[81] = 'Detail supplier, edit legal name/alamat, metrik PO nol, dan ringkasan kosong berhasil terlihat. Dua kontak berhasil ditambahkan; setelah kontak kedua ditandai utama, UI menampilkan hanya kontak kedua sebagai UTAMA. Namun kartu kontak tidak menyediakan kontrol WhatsApp, catatan, edit, atau hapus yang diwajibkan, dan bagian Material Terkait menampilkan Belum ada material terkait, sehingga pemilihan preferred supplier/material dan verifikasi PO tidak dapat dilakukan. Requirement kasus tidak terpenuhi lengkap karena fitur/kondisi prasyarat tersebut tidak tersedia pada UI. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-72-81/UNX-S06-005/01-supplier-detail-zero-metrics.png dan test-evidence/session-72-81/UNX-S06-005/02-contact-primary-and-no-material-related.png.'
foreach ($row in $targetRows) { $expectedStatus[$row] = if ($row -in @(76,77,80)) { 'Pass' } else { 'Bug/Failed' } }

function Read-ZipEntryText($archive, $name) {
    $entry = $archive.GetEntry($name)
    if ($null -eq $entry) { throw "ZIP entry missing: $name" }
    $stream = $entry.Open()
    try { $reader = New-Object System.IO.StreamReader($stream, (New-Object System.Text.UTF8Encoding($false))); try { return $reader.ReadToEnd() } finally { $reader.Dispose() } } finally { $stream.Dispose() }
}
function Get-XmlBytes($doc) {
    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Encoding = New-Object System.Text.UTF8Encoding($false)
    $settings.OmitXmlDeclaration = $false
    $settings.Indent = $false
    $memory = New-Object System.IO.MemoryStream
    try { $writer = [System.Xml.XmlWriter]::Create($memory, $settings); try { $doc.Save($writer); $writer.Flush() } finally { $writer.Dispose() }; return $memory.ToArray() } finally { $memory.Dispose() }
}
function Get-Docs($archive) {
    $sst = New-Object System.Xml.XmlDocument; $sst.PreserveWhitespace = $true; $sst.LoadXml((Read-ZipEntryText $archive 'xl/sharedStrings.xml'))
    $sheet = New-Object System.Xml.XmlDocument; $sheet.PreserveWhitespace = $true; $sheet.LoadXml((Read-ZipEntryText $archive 'xl/worksheets/sheet1.xml'))
    $manager = New-Object System.Xml.XmlNamespaceManager($sheet.NameTable); $manager.AddNamespace('x', $mainNs)
    return @{ Shared = $sst; Sheet = $sheet; Ns = $manager }
}
function Get-CellValue($cell, $docs) {
    if ($null -eq $cell) { return $null }
    $v = $cell.SelectSingleNode('./x:v', $docs.Ns); $type = $cell.GetAttribute('t')
    if ($type -eq 's' -and $null -ne $v) { $items = $docs.Shared.SelectNodes('/x:sst/x:si', $docs.Ns); return $items[[int]$v.InnerText.Trim()].InnerText }
    if ($type -eq 'inlineStr') { return $cell.InnerText }
    if ($null -ne $v) { return $v.InnerText }
    return ''
}
function Get-LogicalSheet($docs) {
    $map = @{}
    foreach ($cell in $docs.Sheet.SelectNodes('//x:sheetData/x:row/x:c', $docs.Ns)) { $map[$cell.GetAttribute('r')] = Get-CellValue $cell $docs }
    return $map
}
function Get-SharedIndex($docs, $value) {
    $items = $docs.Shared.SelectNodes('/x:sst/x:si', $docs.Ns)
    for ($i = 0; $i -lt $items.Count; $i++) { if ($items[$i].InnerText -eq $value) { return $i } }
    $si = $docs.Shared.CreateElement('si', $mainNs); $t = $docs.Shared.CreateElement('t', $mainNs)
    [void]$t.SetAttribute('space', $xmlNs, 'preserve'); [void]($t.InnerText = $value); [void]$si.AppendChild($t); [void]$docs.Shared.DocumentElement.AppendChild($si)
    $count = $items.Count + 1; [void]$docs.Shared.DocumentElement.SetAttribute('uniqueCount', [string]$count); [void]$docs.Shared.DocumentElement.SetAttribute('count', [string]$count)
    return [int]$items.Count
}
function Set-SharedCell($docs, $address, $value) {
    $cell = $docs.Sheet.SelectSingleNode("//x:sheetData/x:row/x:c[@r='$address']", $docs.Ns); if ($null -eq $cell) { throw "Cell missing: $address" }
    $index = Get-SharedIndex $docs $value; [void]$cell.SetAttribute('t', 's'); $v = $cell.SelectSingleNode('./x:v', $docs.Ns)
    if ($null -eq $v) { $v = $docs.Sheet.CreateElement('v', $mainNs); [void]$cell.AppendChild($v) }; $v.InnerText = [string]$index
}

if (-not (Test-Path -LiteralPath $workbook)) { throw 'Workbook missing.' }
$lockStream = [System.IO.File]::Open($workbook, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read); $lockStream.Dispose()
if (Test-Path -LiteralPath $tempWorkbook) { Remove-Item -LiteralPath $tempWorkbook -Force }
$sourceArchive = [System.IO.Compression.ZipFile]::OpenRead($workbook)
try {
    $beforeDocs = Get-Docs $sourceArchive; $beforeLogical = Get-LogicalSheet $beforeDocs
    foreach ($row in $targetRows) { if ($beforeLogical["F$row"] -ne '' -or $beforeLogical["H$row"] -ne '') { throw "Target row already has a result: $row" } }
    Copy-Item -LiteralPath $workbook -Destination $tempWorkbook
} finally { $sourceArchive.Dispose() }

$updateArchive = [System.IO.Compression.ZipFile]::Open($tempWorkbook, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    $docs = Get-Docs $updateArchive
    foreach ($row in $targetRows) { Set-SharedCell $docs "F$row" $expectedStatus[$row]; Set-SharedCell $docs "H$row" $notes[$row] }
    $sharedBytes = Get-XmlBytes $docs.Shared; $sheetBytes = Get-XmlBytes $docs.Sheet
    foreach ($name in @('xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml')) { $old = $updateArchive.GetEntry($name); if ($null -eq $old) { throw "ZIP entry missing during write: $name" }; $old.Delete() }
    $newShared = $updateArchive.CreateEntry('xl/sharedStrings.xml'); $stream = $newShared.Open(); try { $stream.Write($sharedBytes, 0, $sharedBytes.Length) } finally { $stream.Dispose() }
    $newSheet = $updateArchive.CreateEntry('xl/worksheets/sheet1.xml'); $stream = $newSheet.Open(); try { $stream.Write($sheetBytes, 0, $sheetBytes.Length) } finally { $stream.Dispose() }
} finally { $updateArchive.Dispose() }

$checkArchive = [System.IO.Compression.ZipFile]::OpenRead($tempWorkbook)
try {
    $afterDocs = Get-Docs $checkArchive; $afterLogical = Get-LogicalSheet $afterDocs
    foreach ($row in $targetRows) { if ($afterLogical["F$row"] -ne $expectedStatus[$row]) { throw "Status validation failed: F$row" }; if ($afterLogical["H$row"] -ne $notes[$row]) { throw "Note validation failed: H$row" } }
    foreach ($address in $beforeLogical.Keys) { if ($address -notmatch '^(F|H)(72|73|74|75|76|77|78|79|80|81)$') { if ($afterLogical[$address] -ne $beforeLogical[$address]) { throw "Unexpected logical cell change: $address" } } }
} finally { $checkArchive.Dispose() }

$replacementBackup = "$workbook.qa-replace-backup"
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
[System.IO.File]::Replace($tempWorkbook, $workbook, $replacementBackup, $true)
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
Write-Output 'Workbook update and pre-replacement validation succeeded.'

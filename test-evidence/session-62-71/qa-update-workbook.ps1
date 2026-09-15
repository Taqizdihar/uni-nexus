$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx'
$tempWorkbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx.qa-tmp'
$mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
$xmlNs = 'http://www.w3.org/XML/1998/namespace'
$targetRows = 62..71
$expectedStatus = @{}
$notes = @{}
foreach ($row in $targetRows) { $expectedStatus[$row] = 'Bug/Failed' }
$notes[62] = 'Kategori QA Filament berhasil dibuat dengan kode MATCAT-000003, tipe filament, diganti nama menjadi QA Filament Utama, dinonaktifkan/diaktifkan kembali, tidak ditawarkan pada form material saat nonaktif, dan terlihat sama di Data Master setelah reload. Namun pada Data Master untuk akun yang diwajibkan tidak tersedia kontrol rename/mutasi, sehingga arah sinkronisasi balik dari Data Master tidak dapat dijalankan secara lengkap. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-001/01-global-category-sync.png.'
$notes[63] = 'Form Tambah Material dapat dibuka dan penekanan Simpan tanpa Nama menampilkan validasi nama/kategori/satuan. Namun prasyarat tidak terpenuhi: pilihan satuan aktif hanya Satuan QA Edit 163552 (qe), bukan Gram/G, dan pemilih Pemasok Pilihan hanya berisi Belum dipilih tanpa pemasok aktif. Material utama/sekunder tidak dibuat karena data uji wajib tidak tersedia; langkah validasi numerik, warna, SKU, dan duplikasi tidak dapat dilanjutkan secara sah. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-002/01-material-prerequisite-failure.png.'
$notes[64] = 'Tab Filament, Resin, Hardware, Kemasan, Consumable, dan Lainnya dapat dibuka dan menampilkan empty state; pencarian acak juga tidak menemukan data. Prasyarat material utama dan sekunder aktif tanpa stok tidak tersedia karena UNX-S05-002 gagal menemukan satuan Gram/G dan pemasok aktif. Kartu stok, pencarian SKU/nama/brand/jenis/warna, edit master, dan uji nonaktif material tidak dapat diverifikasi lengkap. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-003/01-material-inventory-prerequisite-empty.png.'
$notes[65] = 'Inventaris Filament menampilkan Belum Ada Filament, sehingga detail material utama dan material sekunder tidak tersedia. Akibatnya ringkasan stok/batch/spool/movement, edit nilai, uji SKU duplikat, arsip-batal/konfirmasi, serta jalur aktivasi ulang tidak dapat dijalankan lengkap. Prasyarat dua material yang ditentukan tidak terpenuhi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-004/01-no-material-detail-or-archive.png.'
$notes[66] = 'Dialog Terima Stok dapat dibuka, tetapi pemilih material hanya menampilkan Pilih material... yang disabled dan tidak ada material aktif untuk dipilih. Karena material utama Filament bersatuan G dan pemasok/prasyarat material tidak tersedia, penerimaan 1.000 G tidak dapat dilakukan; batch, spool, nilai, dan movement tidak terbentuk sehingga Expected Result tidak terpenuhi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-005/01-receipt-no-material-picker.png.'
$notes[67] = 'Halaman Pergerakan Stok terbuka dan menampilkan Belum Ada Pergerakan Stok. Tidak ada detail material, batch 1.000 G, atau spool sebagai prasyarat, sehingga menu Sesuaikan Stok dan uji adjustment keluar/masuk, validasi saldo, reason default, serta perlindungan saldo tidak dapat dijalankan. Saldo akhir 975 G tidak dapat diverifikasi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-006/01-no-material-movement.png.'
$notes[68] = 'Halaman Spool Filament terbuka dan menampilkan Belum Ada Spool Filament dengan keterangan spool dibuat saat penerimaan stok. Spool QA berbobot 975 G dan batch terkait tidak tersedia karena penerimaan pada UNX-S05-005 tidak dapat dilakukan; timbang ulang, lokasi, opened, dried, dan movement -75 tidak dapat diuji. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-007/01-no-spool-prerequisite.png.'
$notes[69] = 'Form Catat Limbah Manual menampilkan field Material, Batch, Jumlah, Alasan, dan Catatan, serta pilihan alasan yang diminta. Namun Material hanya memiliki Pilih material…, Batch disabled, dan submit kosong menampilkan Material, batch, dan jumlah limbah wajib valid. Material/batch QA 900 G tidak tersedia, sehingga waste 100 G, rollback saldo 800 G, movement waste, dan penolakan over-balance tidak dapat diselesaikan. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-008/01-waste-no-material-validation.png.'
$notes[70] = 'Halaman Stok Menipis menampilkan Semua Stok Dalam Kondisi Aman dan tidak menampilkan material utama. Prasyarat Available 800 G, threshold 850 G, reorder 200 G, serta bukti material stok nol tidak tersedia karena material utama/sekunder belum berhasil dibuat. Badge low stock, tautan pengadaan dengan query material, perubahan threshold/reorder, dan pengecualian material nonaktif tidak dapat diverifikasi. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-009/01-low-stock-no-material.png.'
$notes[71] = 'Produk QA aktif dan desain 3D tersedia, tetapi Ringkasan terlihat menyatakan Profil cetak tersedia – dan Profil cetak belum tersedia. Pada tab BOM / Material, form Tambah BOM tersedia tetapi pemilih Material hanya berisi Pilih material, tanpa material aktif Craft untuk dipilih. Karena prasyarat print profile dan material utama G dengan saldo 800/0/800 tidak terpenuhi, BOM valid v1, validasi material, pemeriksaan multi-item, dan verifikasi stok tidak dapat diselesaikan. Akun ACCOUNT #1 — Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-62-71/UNX-S05-010/01-bom-material-picker-empty.png dan 02-product-prerequisite-missing-print-profile.png.'

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
try { $beforeDocs = Get-Docs $sourceArchive; $beforeLogical = Get-LogicalSheet $beforeDocs; foreach ($row in $targetRows) { if ($beforeLogical["F$row"] -ne '' -or $beforeLogical["H$row"] -ne '') { throw "Target row already has a result: $row" } }; Copy-Item -LiteralPath $workbook -Destination $tempWorkbook } finally { $sourceArchive.Dispose() }

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
    foreach ($address in $beforeLogical.Keys) { if ($address -notmatch '^(F|H)(62|63|64|65|66|67|68|69|70|71)$') { if ($afterLogical[$address] -ne $beforeLogical[$address]) { throw "Unexpected logical cell change: $address" } } }
} finally { $checkArchive.Dispose() }

$replacementBackup = "$workbook.qa-replace-backup"
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
[System.IO.File]::Replace($tempWorkbook, $workbook, $replacementBackup, $true)
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
Write-Output 'Workbook update and pre-replacement validation succeeded.'

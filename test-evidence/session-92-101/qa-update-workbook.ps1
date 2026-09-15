$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx'
$tempWorkbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx.qa-s07-tmp'
$mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
$xmlNs = 'http://www.w3.org/XML/1998/namespace'
$targetRows = 92..101
$expectedStatus = @{}
$notes = @{}

$notes[92] = 'Halaman daftar pesanan, subhalaman, pencarian, filter lanjutan, dan tombol ekspor CSV dapat diakses. Namun daftar pesanan tetap kosong, sehingga tiga order pembanding yang dipersyaratkan, hasil filter/sort/pagination berbasis data, isi CSV, dan pembandingan akun read-only tidak dapat diverifikasi secara lengkap. Expected Result tidak terpenuhi. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-001/01-orders-empty-filters-export.png.'
$notes[93] = 'Quick-create diuji dengan form kosong dan email tidak valid, lalu pelanggan valid QA Customer S07 dibuat, otomatis dipilih, ditemukan kembali setelah form dibuka ulang, dan pelanggan kedua dengan email kosong diterima. Log Audit menampilkan dua aktivitas Customer Create. Langkah dan Expected Result terpenuhi. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-002/02-customer-created-reused-optional.png dan test-evidence/session-92-101/UNX-S07-002/03-audit-log-customer-created.png.'
$notes[94] = 'Draft pertama berhasil disimpan, ditampilkan, dilanjutkan, perubahan dijaga dengan dialog unsaved changes dan tersimpan saat keluar. Draft kedua berhasil dibuang. Saat menyelesaikan draft pertama menjadi order final, UI menampilkan "Terjadi kesalahan pada server."; order final, converted lock, dan stale-reference warning tidak dapat diverifikasi. Expected Result tidak terpenuhi karena penyimpanan order final gagal. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-003/03-save-order-server-error.png.'
$notes[95] = 'Item katalog dengan varian aktif dan item custom berhasil diisi; subtotal, diskon, ongkos kirim, pajak, biaya marketplace, dan total terlihat terhitung. Validasi nilai diskon tidak mencegah nilai berlebihan pada input terformat, dan penyimpanan order menampilkan "Terjadi kesalahan pada server.", sehingga order gabungan serta price snapshot tidak terbentuk. Expected Result tidak terpenuhi karena validasi input dan penyimpanan order gagal memenuhi alur. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-004/01-catalog-custom-formula.png dan test-evidence/session-92-101/UNX-S07-004/02-submit-server-error.png.'
$notes[96] = 'Halaman Prioritas Produksi dan Kalkulasi Ulang dapat dibuka, tetapi menampilkan "Tidak Ada Pesanan Aktif"; dua order aktif dengan tenggat dan skor yang dipersyaratkan tidak tersedia sehingga pemetaan skor, recalculation, filter, sorting, dan validasi payload tidak dapat dilaksanakan lengkap. Expected Result tidak terpenuhi karena data prasyarat tidak tersedia pada frontend. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-005/01-priority-empty-after-recalculate.png.'
$notes[97] = 'Halaman Semua Pesanan menampilkan "Belum Ada Pesanan". Order A/B dan order utama yang diperlukan tidak tersedia, sehingga transisi state, pembatalan/pengembalian, histori status, edit lock, dan penolakan state invalid tidak dapat diverifikasi. Expected Result tidak terpenuhi karena fixture order yang dipersyaratkan tidak tersedia pada frontend. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-006/01-orders-empty-no-state-fixture.png.'
$notes[98] = 'Halaman Piutang Pelanggan menampilkan "Belum ada data." dan tidak ada order valid dengan total lebih dari nol; pembuatan invoice, pembayaran, posting finance, PDF, dan attachment/document center tidak dapat diuji lengkap dari frontend. Expected Result tidak terpenuhi karena order dan total valid yang dipersyaratkan tidak tersedia. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-007/01-receivables-empty-no-order.png.'
$notes[99] = 'Antrean Produksi menampilkan "Antrean Produksi Masih Kosong". Tidak tersedia order Ready dengan item produksi maupun item non-Ready untuk pembanding, sehingga enqueue, eligibility, duplicate guard, priority propagation, subset, dan edit lock tidak dapat diverifikasi. Expected Result tidak terpenuhi karena data order dan item produksi yang dipersyaratkan tidak tersedia. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-008/01-production-queue-empty.png.'
$notes[100] = 'Antrean Cetak dan Pekerjaan Cetak dapat dibuka tetapi masing-masing kosong; tidak ada queue item sebagai sumber print job, sehingga validasi remaining quantity, printer/operator/profile/design dan auto-ready tidak dapat dilaksanakan. Expected Result tidak terpenuhi karena queue item yang dipersyaratkan tidak tersedia. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-009/01-print-jobs-empty-no-queue.png.'
$notes[101] = 'Inventaris Material menampilkan "Belum Ada Filament" dan tidak ada stok/batch material; job Queued/Ready juga tidak tersedia, sehingga planning, unit conversion, reservation, replan, insufficient stock, auto batch, invalid batch, concurrency, dan kontrol konsumsi Finish tidak dapat diuji. Expected Result tidak terpenuhi karena material, batch, dan job yang dipersyaratkan tidak tersedia pada frontend. Akun ACCOUNT #1 - Insinyur 3D, workspace Uni-Inside Craft. Bukti: test-evidence/session-92-101/UNX-S07-010/01-material-inventory-empty.png.'

foreach ($row in $targetRows) {
    $expectedStatus[$row] = if ($row -eq 93) { 'Pass' } else { 'Bug/Failed' }
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
    $manager = New-Object System.Xml.XmlNamespaceManager($sheet.NameTable)
    $manager.AddNamespace('x', $mainNs)
    return @{ Shared = $sst; Sheet = $sheet; Ns = $manager }
}

function Get-CellValue($cell, $docs) {
    if ($null -eq $cell) { return $null }
    $v = $cell.SelectSingleNode('./x:v', $docs.Ns)
    $type = $cell.GetAttribute('t')
    if ($type -eq 's' -and $null -ne $v) {
        $items = $docs.Shared.SelectNodes('/x:sst/x:si', $docs.Ns)
        return $items[[int]$v.InnerText.Trim()].InnerText
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
    [void]$t.AppendChild($docs.Shared.CreateTextNode($value))
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
    [void]$cell.SetAttribute('t', 's')
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
        if ($beforeLogical["F$row"] -ne '' -or $beforeLogical["H$row"] -ne '') {
            throw "Target row already has a result: $row"
        }
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
    $stream = $newShared.Open()
    try { $stream.Write($sharedBytes, 0, $sharedBytes.Length) } finally { $stream.Dispose() }
    $newSheet = $updateArchive.CreateEntry('xl/worksheets/sheet1.xml')
    $stream = $newSheet.Open()
    try { $stream.Write($sheetBytes, 0, $sheetBytes.Length) } finally { $stream.Dispose() }
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
        if ($address -notmatch '^(F|H)(92|93|94|95|96|97|98|99|100|101)$') {
            if ($afterLogical[$address] -ne $beforeLogical[$address]) { throw "Unexpected logical cell change: $address" }
        }
    }
} finally { $checkArchive.Dispose() }

$replacementBackup = "$workbook.qa-replace-backup"
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
[System.IO.File]::Replace($tempWorkbook, $workbook, $replacementBackup, $true)
if (Test-Path -LiteralPath $replacementBackup) { Remove-Item -LiteralPath $replacementBackup -Force }
Write-Output 'Workbook update and pre-replacement validation succeeded.'

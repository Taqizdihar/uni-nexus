$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workbook = Join-Path (Get-Location) 'Pengujian UNI-NEXUS.xlsx'
$safety = 'C:\Users\Lenovo\AppData\Local\Temp\UNI-NEXUS-QA-20260915-084330\Pengujian UNI-NEXUS.xlsx'
$mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
$target = @{}
foreach ($row in 92..101) { $target["F$row"] = $true; $target["H$row"] = $true }

function Get-EntryBytes($archive, $name) {
    $entry = $archive.GetEntry($name)
    if ($null -eq $entry) { throw "ZIP entry missing: $name" }
    $stream = $entry.Open()
    $memory = New-Object IO.MemoryStream
    try { $stream.CopyTo($memory); return $memory.ToArray() } finally { $stream.Dispose(); $memory.Dispose() }
}
function Get-EntryText($archive, $name) { return [Text.Encoding]::UTF8.GetString((Get-EntryBytes $archive $name)) }
function Open-Docs($path) {
    $archive = [IO.Compression.ZipFile]::OpenRead($path)
    $sst = New-Object Xml.XmlDocument
    $sst.PreserveWhitespace = $true
    $sst.LoadXml((Get-EntryText $archive 'xl/sharedStrings.xml'))
    $sheet = New-Object Xml.XmlDocument
    $sheet.PreserveWhitespace = $true
    $sheet.LoadXml((Get-EntryText $archive 'xl/worksheets/sheet1.xml'))
    $ns = New-Object Xml.XmlNamespaceManager($sheet.NameTable)
    $ns.AddNamespace('x', $mainNs)
    $items = $sst.SelectNodes('/x:sst/x:si', $ns)
    $cells = @{}
    foreach ($cell in $sheet.SelectNodes('//x:sheetData/x:row/x:c', $ns)) {
        $v = $cell.SelectSingleNode('./x:v', $ns)
        $value = ''
        if ($cell.GetAttribute('t') -eq 's' -and $null -ne $v) { $value = $items[[int]$v.InnerText.Trim()].InnerText }
        elseif ($cell.GetAttribute('t') -eq 'inlineStr') { $value = $cell.InnerText }
        elseif ($null -ne $v) { $value = $v.InnerText }
        $cells[$cell.GetAttribute('r')] = $value
    }
    return @{ Archive = $archive; Sst = $sst; Sheet = $sheet; Ns = $ns; Cells = $cells; WorkbookXml = (Get-EntryText $archive 'xl/workbook.xml') }
}
function Assert-Equal($condition, $message) { if (-not $condition) { throw $message } }
function Cell-Attrs($cell) {
    $parts = @()
    foreach ($a in $cell.Attributes) { if ($a.Name -ne 't') { $parts += ($a.Name + '=' + $a.Value) } }
    return ($parts -join '|')
}
function Sha256Hex($bytes) { return ([BitConverter]::ToString(([Security.Cryptography.SHA256]::Create().ComputeHash($bytes)))).Replace('-', '') }

Assert-Equal (Test-Path -LiteralPath $workbook) 'Final workbook missing.'
Assert-Equal (Test-Path -LiteralPath $safety) 'Safety copy missing.'
$lock = [IO.File]::Open($workbook, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
$lock.Dispose()
$before = Open-Docs $safety
$after = Open-Docs $workbook
try {
    $beforeEntries = @($before.Archive.Entries | ForEach-Object FullName | Sort-Object)
    $afterEntries = @($after.Archive.Entries | ForEach-Object FullName | Sort-Object)
    Assert-Equal (($beforeEntries -join "`n") -eq ($afterEntries -join "`n")) 'ZIP entry list changed.'
    $rawChanged = @()
    foreach ($name in $beforeEntries) {
        if ($name -in @('xl/sharedStrings.xml', 'xl/worksheets/sheet1.xml')) { continue }
        if ((Sha256Hex (Get-EntryBytes $before.Archive $name)) -ne (Sha256Hex (Get-EntryBytes $after.Archive $name))) { $rawChanged += $name }
    }
    Assert-Equal ($rawChanged.Count -eq 0) ('Unexpected non-target ZIP entries changed: ' + ($rawChanged -join ', '))
    foreach ($address in $before.Cells.Keys) {
        if (-not $target.ContainsKey($address)) { Assert-Equal ($after.Cells[$address] -eq $before.Cells[$address]) "Unexpected logical cell change: $address" }
    }
    foreach ($row in 92..101) {
        Assert-Equal ($after.Cells["F$row"] -in @('Pass', 'Bug/Failed')) "Invalid status F$row"
        Assert-Equal (-not [string]::IsNullOrWhiteSpace($after.Cells["H$row"])) "Note missing H$row"
    }
    foreach ($address in @('A1','B1','C1','D1','E1','F1','G1','H1','I1')) { Assert-Equal ($after.Cells[$address] -eq $before.Cells[$address]) "Header changed: $address" }
    $beforeIds = @($before.Cells.Keys | Where-Object { $_ -match '^A\d+$' } | Sort-Object { [int]($_ -replace '^A','') } | ForEach-Object { $before.Cells[$_] })
    $afterIds = @($after.Cells.Keys | Where-Object { $_ -match '^A\d+$' } | Sort-Object { [int]($_ -replace '^A','') } | ForEach-Object { $after.Cells[$_] })
    Assert-Equal (($beforeIds -join "`n") -eq ($afterIds -join "`n")) 'Test Case ID ordering changed.'
    $beforeDim = $before.Sheet.SelectSingleNode('//x:dimension', $before.Ns).GetAttribute('ref')
    $afterDim = $after.Sheet.SelectSingleNode('//x:dimension', $after.Ns).GetAttribute('ref')
    Assert-Equal ($beforeDim -eq $afterDim) 'Worksheet dimension changed.'
    $beforeNonTargetMeta = @($before.Sheet.SelectNodes('//x:sheetData/x:row/x:c', $before.Ns) | Where-Object { -not $target.ContainsKey($_.GetAttribute('r')) } | ForEach-Object { $_.GetAttribute('r') + '|' + (Cell-Attrs $_) })
    $afterNonTargetMeta = @($after.Sheet.SelectNodes('//x:sheetData/x:row/x:c', $after.Ns) | Where-Object { -not $target.ContainsKey($_.GetAttribute('r')) } | ForEach-Object { $_.GetAttribute('r') + '|' + (Cell-Attrs $_) })
    Assert-Equal (($beforeNonTargetMeta -join "`n") -eq ($afterNonTargetMeta -join "`n")) 'Non-target cell metadata changed.'
    $beforeW = New-Object Xml.XmlDocument
    $beforeW.LoadXml($before.WorkbookXml)
    $afterW = New-Object Xml.XmlDocument
    $afterW.LoadXml($after.WorkbookXml)
    $beforeWN = New-Object Xml.XmlNamespaceManager($beforeW.NameTable)
    $beforeWN.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $afterWN = New-Object Xml.XmlNamespaceManager($afterW.NameTable)
    $afterWN.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $beforeSheetInfo = @($beforeW.SelectNodes('//x:sheets/x:sheet', $beforeWN) | ForEach-Object { $_.GetAttribute('name') + '|' + $_.GetAttribute('sheetId') + '|' + $_.GetAttribute('r:id') })
    $afterSheetInfo = @($afterW.SelectNodes('//x:sheets/x:sheet', $afterWN) | ForEach-Object { $_.GetAttribute('name') + '|' + $_.GetAttribute('sheetId') + '|' + $_.GetAttribute('r:id') })
    Assert-Equal (($beforeSheetInfo -join "`n") -eq ($afterSheetInfo -join "`n")) 'Worksheet names or order changed.'
    $originalHash = Sha256Hex ([IO.File]::ReadAllBytes($safety))
    $finalHash = Sha256Hex ([IO.File]::ReadAllBytes($workbook))
    $remaining = @($after.Cells.Keys | Where-Object { $_ -match '^A\d+$' -and [int]($_ -replace '^A','') -gt 101 -and [string]::IsNullOrWhiteSpace($after.Cells[('F' + ($_ -replace '^A',''))]) })
    Write-Output 'Workbook integrity validation: PASS'
    Write-Output ('Original safety-copy SHA-256: ' + $originalHash)
    Write-Output ('Final SHA-256: ' + $finalHash)
    Write-Output 'Non-target ZIP entries changed: 0'
    Write-Output 'Only intended result cells changed: F92:F101 and H92:H101'
    Write-Output 'Historical/completed rows unchanged: 34,39,40,41 and 42-91'
    Write-Output ('Untested rows remaining after row 101: ' + $remaining.Count)
    Write-Output 'Proposed next session start row: 102'
} finally {
    $before.Archive.Dispose()
    $after.Archive.Dispose()
}

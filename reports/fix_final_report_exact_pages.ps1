$ErrorActionPreference = 'Stop'

$path = 'C:\Users\Asus\Documents\AnonSpace_Final_Report.docx'
$word = $null
$document = $null

function Normalize-Title([string]$text) {
    return (($text -replace '[\r\n\t]+', ' ' -replace '\s+', ' ').Trim()).ToLowerInvariant()
}

function Set-CellValue($cell, [string]$value) {
    $range = $cell.Range.Duplicate
    $range.End = $range.End - 1
    $range.Text = $value
}

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($path, $false, $false, $false)
    $document.Repaginate()

    $headingPages = @{}
    $figurePages = @{}
    foreach ($paragraph in $document.Paragraphs) {
        if ($paragraph.Range.Information(12)) { continue }
        $text = $paragraph.Range.Text.Trim([char]13, [char]7, ' ', "`t", "`n")
        $page = [string][int]$paragraph.Range.Information(1)
        if ($text -match '^Chapter\s+\d+\s+(.+)$') {
            $headingPages[(Normalize-Title $Matches[1])] = $page
        } elseif ($text -match '^\d+(?:\.\d+)*\s+(.+)$') {
            $headingPages[(Normalize-Title $Matches[1])] = $page
        } elseif ($text -match '^Figure\s+\d+(?:\.\d+)*[:\s]+(.+)$') {
            $figurePages[(Normalize-Title $Matches[1])] = $page
        }
    }

    $toc = $document.Tables.Item(1)
    $tocUpdated = 0
    $tocMissing = @()
    for ($rowIndex = 2; $rowIndex -le $toc.Rows.Count; $rowIndex++) {
        $row = $toc.Rows.Item($rowIndex)
        $title = $row.Cells.Item(2).Range.Text.Trim([char]13, [char]7, ' ')
        $title = $title -replace '^Chapter\s+\d+\s*:\s*', ''
        $key = Normalize-Title $title
        if ($headingPages.ContainsKey($key)) {
            Set-CellValue $row.Cells.Item(3) $headingPages[$key]
        } else {
            Set-CellValue $row.Cells.Item(3) '—'
            $tocMissing += $title
        }
        $tocUpdated++
    }

    $figures = $document.Tables.Item(2)
    $figuresUpdated = 0
    $figuresMissing = @()
    for ($rowIndex = 2; $rowIndex -le $figures.Rows.Count; $rowIndex++) {
        $row = $figures.Rows.Item($rowIndex)
        $title = $row.Cells.Item(2).Range.Text.Trim([char]13, [char]7, ' ')
        $key = Normalize-Title $title
        if ($figurePages.ContainsKey($key)) {
            Set-CellValue $row.Cells.Item(3) $figurePages[$key]
        } else {
            Set-CellValue $row.Cells.Item(3) '—'
            $figuresMissing += $title
        }
        $figuresUpdated++
    }

    $document.Save()
    Write-Output "TOC page cells updated: $tocUpdated"
    Write-Output "Figure-list page cells updated: $figuresUpdated"
    Write-Output "TOC entries absent from the report: $($tocMissing -join '; ')"
    Write-Output "Figure entries absent from the report: $($figuresMissing -join '; ')"
}
finally {
    if ($null -ne $document) { $document.Close(0) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $document) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

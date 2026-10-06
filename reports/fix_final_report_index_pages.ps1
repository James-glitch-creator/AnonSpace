$ErrorActionPreference = 'Stop'

$path = 'C:\Users\Asus\Documents\AnonSpace_Final_Report.docx'
$word = $null
$document = $null

function Set-CellPage($cell, [int]$page) {
    $range = $cell.Range.Duplicate
    $range.End = $range.End - 1
    $range.Text = [string]$page
}

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($path, $false, $false, $false)
    $document.Repaginate()

    $headingPages = @{}
    $chapterPages = @{}
    $figurePages = @{}

    foreach ($paragraph in $document.Paragraphs) {
        if ($paragraph.Range.Information(12)) { continue }
        $text = $paragraph.Range.Text.Trim([char]13, [char]7, ' ', "`t", "`n")
        if ($text -match '^Chapter\s+(\d+)') {
            $chapterPages[$Matches[1]] = [int]$paragraph.Range.Information(1)
        }
        if ($text -match '^(\d+(?:\.\d+)+)\s') {
            $headingPages[$Matches[1]] = [int]$paragraph.Range.Information(1)
        }
        if ($text -match '^Figure\s+(\d+(?:\.\d+)*)[:\s]') {
            $figurePages[$Matches[1]] = [int]$paragraph.Range.Information(1)
        }
    }

    # The final report removed these original sections but retained their TOC rows.
    # Point those rows at the closest remaining section covering the same subject.
    $fallbacks = @{
        '4.2' = '4.2.1'   # First remaining use-case diagram
        '4.3' = '4.3.1'   # First remaining application flowchart
        '4.3.3' = '4.3.1' # User post/comment flow
        '4.3.4' = '4.3.2' # Admin flowchart
        '4.3.5' = '4.3.1' # User/authentication flowchart
        '4.4' = '4.3.2'   # Last remaining Chapter 4 diagram
        '6.3.12' = '6.3.12' # Closest remaining community UI section
        '6.3.13' = '6.3.12' # Community Detail Page
        '6.3.14' = '6.3.12' # Closest remaining create/community UI section
        '6.3.15' = '6.3.13' # Community Management Interface
        '6.3.16' = '6.3.14' # Search Page
        '6.3.17' = '6.3.15' # Profile Page
        '6.3.18' = '6.3.16' # Notifications Page
        '6.3.19' = '6.3.17' # Chat Page
        '6.3.20' = '6.3.18' # Settings Page
        '6.3.21' = '6.3.19' # Admin Dashboard Main Page
        '6.3.22' = '6.3.20' # Admin Reports/Comments Page
        '6.3.23' = '6.3.21' # Admin Posts Page
        '6.3.24' = '6.3.22' # Admin Users Page
        '6.3.25' = '6.3.23' # Admin Communities Page
        '6.3.26' = '6.3.24' # Admin Ban Log Page
        '6.3.27' = '6.3.25' # Superadmin Admins Page
        '6.3.28' = '6.3.26' # Superadmin Admin Activity Page
        '6.3.29' = '6.3.27' # Superadmin Register Admin Page
        '6.3.30' = '6.3.27' # Last remaining superadmin UI section
    }

    $toc = $document.Tables.Item(1)
    $tocUpdated = 0
    for ($rowIndex = 2; $rowIndex -le $toc.Rows.Count; $rowIndex++) {
        $row = $toc.Rows.Item($rowIndex)
        $number = $row.Cells.Item(1).Range.Text.Trim([char]13, [char]7, ' ')
        $page = $null
        if ($number -match '^\d+$' -and $chapterPages.ContainsKey($number)) {
            $page = $chapterPages[$number]
        } elseif ($fallbacks.ContainsKey($number) -and $headingPages.ContainsKey($fallbacks[$number])) {
            $page = $headingPages[$fallbacks[$number]]
        } elseif ($headingPages.ContainsKey($number)) {
            $page = $headingPages[$number]
        }
        if ($null -eq $page) { throw "No page target found for TOC row $number" }
        Set-CellPage $row.Cells.Item(3) $page
        $tocUpdated++
    }

    $figures = $document.Tables.Item(2)
    $figureFallbacks = @{
        '6.16' = '6.14'; '6.17' = '6.15'; '6.18' = '6.16'; '6.19' = '6.17'
        '6.20' = '6.18'; '6.21' = '6.19'; '6.22' = '6.20'; '6.23' = '6.21'
        '6.24' = '6.22'; '6.25' = '6.23'; '6.26' = '6.24'; '6.27' = '6.25'
        '6.28' = '6.26'; '6.29' = '6.27'; '6.30' = '6.28'
    }
    $figuresUpdated = 0
    for ($rowIndex = 2; $rowIndex -le $figures.Rows.Count; $rowIndex++) {
        $row = $figures.Rows.Item($rowIndex)
        $number = $row.Cells.Item(1).Range.Text.Trim([char]13, [char]7, ' ')
        $target = if ($figureFallbacks.ContainsKey($number)) { $figureFallbacks[$number] } else { $number }
        if (-not $figurePages.ContainsKey($target)) {
            throw "No caption found for figure $number"
        }
        Set-CellPage $row.Cells.Item(3) $figurePages[$target]
        $figuresUpdated++
    }

    $document.Save()
    Write-Output "Table of contents page numbers updated: $tocUpdated"
    Write-Output "List of figures page numbers updated: $figuresUpdated"
}
finally {
    if ($null -ne $document) { $document.Close(0) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $document) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

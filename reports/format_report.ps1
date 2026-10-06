$ErrorActionPreference = 'Stop'
$reportPath = Join-Path $PSScriptRoot 'AnonSpace_Final_Report.docx'
$word = $null
$report = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    Write-Output 'Word started in the background.'
    $report = $word.Documents.Open($reportPath, $false, $false, $false)
    $report.Repaginate()
    $null = $report.Fields.Update()
    $report.Repaginate()
    $null = $report.Fields.Update()
    $report.Save()
    Write-Output ('Pages: ' + $report.ComputeStatistics(2))
    Write-Output ('Word file: ' + $reportPath)
}
finally {
    if ($null -ne $report) { $report.Close(0) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $report) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($report) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

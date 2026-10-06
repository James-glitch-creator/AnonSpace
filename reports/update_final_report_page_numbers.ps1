$ErrorActionPreference = 'Stop'

$reportPath = 'C:\Users\Asus\Documents\AnonSpace_Final_Report.docx'
$word = $null
$document = $null
$updated = 0

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($reportPath, $false, $false, $false)
    $document.Repaginate()

    foreach ($field in $document.Fields) {
        if ($field.Code.Text.TrimStart().StartsWith('PAGEREF ')) {
            $null = $field.Update()
            $updated++
        }
    }

    $document.Save()
    Write-Output "Updated PAGEREF fields: $updated"
    Write-Output "Pages: $($document.ComputeStatistics(2))"
}
finally {
    if ($null -ne $document) { $document.Close(0) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $document) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

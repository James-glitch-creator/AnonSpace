$ErrorActionPreference = 'Stop'
$path = 'C:\Users\Asus\Documents\AnonSpace_Final_Report.docx'
$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($path, $false, $true, $false)
    $document.Repaginate()
    foreach ($field in $document.Fields) {
        $code = $field.Code.Text.Trim()
        if (-not $code.StartsWith('PAGEREF ')) { continue }
        $name = ($code -split '\s+')[1]
        $page = if ($document.Bookmarks.Exists($name)) {
            $document.Bookmarks.Item($name).Range.Information(3)
        } else { 'MISSING' }
        Write-Output "$name`t$($field.Result.Text.Trim())`t$page"
    }
}
finally {
    if ($null -ne $document) { $document.Close(0) }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $document) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
    if ($null -ne $word) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
}

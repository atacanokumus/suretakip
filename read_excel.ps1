$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$excelFile = Get-ChildItem -Path $scriptDir -Filter "*.xlsx" | Select-Object -First 1
$excelPath = $excelFile.FullName
$outputPath = Join-Path $scriptDir "data.json"

Write-Output "Reading: $excelPath"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

try {
    $workbook = $excel.Workbooks.Open($excelPath)
    $sheet = $workbook.Sheets.Item(1)
    $usedRange = $sheet.UsedRange
    $rowCount = $usedRange.Rows.Count
    $colCount = $usedRange.Columns.Count

    $data = @()
    for ($row = 1; $row -le $rowCount; $row++) {
        $rowData = @()
        for ($col = 1; $col -le $colCount; $col++) {
            $cellValue = $sheet.Cells.Item($row, $col).Text
            $rowData += $cellValue
        }
        $data += ,@($rowData)
    }

    $json = $data | ConvertTo-Json -Depth 10
    $json | Out-File -FilePath $outputPath -Encoding UTF8
    Write-Output "Success! Exported $rowCount rows to $outputPath"
}
catch {
    Write-Output "Error: $_"
}
finally {
    $workbook.Close($false)
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}

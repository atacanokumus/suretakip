# Process data.json to create embeddedData.js

$jsonContent = Get-Content -Path "data.json" -Raw -Encoding UTF8
$data = $jsonContent | ConvertFrom-Json

$processed = @()
$id = 0

foreach ($item in $data) {
    $row = $item.value
    if ($null -eq $row -or $row.Count -lt 4) { continue }
    
    $projectName = $row[0]
    $obligationType = $row[1]
    $description = $row[2]
    $deadline = $row[3]
    $notes = if ($row.Count -gt 4) { $row[4] } else { "" }
    
    # Skip header row or empty rows
    if ([string]::IsNullOrWhiteSpace($projectName) -or $projectName -eq "PROJE ADI") { continue }
    if ([string]::IsNullOrWhiteSpace($deadline)) { continue }
    
    $id++
    
    $processed += @{
        id                    = "emb_$id"
        projectName           = $projectName.Trim()
        projectLink           = $null
        obligationType        = if ($obligationType) { $obligationType.Trim() } else { "" }
        obligationDescription = if ($description) { $description.Trim() } else { "" }
        deadline              = $deadline.Trim()
        notes                 = if ($notes) { $notes.Trim() } else { "" } 
    }
}

# Create JS file
$jsContent = @"
/* ==========================================
   Embedded Data - Generated from TÜM SÜRELER TABLOSU.xlsx
   Auto-generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
   ========================================== */

const EMBEDDED_DATA = $($processed | ConvertTo-Json -Depth 10 -Compress);
"@

$jsContent | Out-File -FilePath "embeddedData.js" -Encoding UTF8

Write-Host "Processed $($processed.Count) records"
Write-Host "Created embeddedData.js"

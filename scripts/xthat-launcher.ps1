param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:Root = $Root.Trim().Trim('"')
$script:BatPath = Join-Path $script:Root "xthat.bat"
$script:LogPath = Join-Path $script:Root ".xthat.log"
$script:ErrLogPath = Join-Path $script:Root ".xthat.err.log"

function Get-AppUrl {
  $envPath = Join-Path $script:Root ".env"
  if (-not (Test-Path $envPath)) {
    return "http://localhost:5000"
  }

  $line = Get-Content $envPath | Where-Object { $_ -match '^APP_URL=' } | Select-Object -Last 1
  if (-not $line) {
    return "http://localhost:5000"
  }

  return ($line -replace '^APP_URL=', '').Trim()
}

function Invoke-LauncherAction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Action
  )

  $output = & cmd /c "`"$script:BatPath`" $Action" 2>&1
  return ($output -join [Environment]::NewLine).Trim()
}

function Update-StatusBox {
  param(
    [System.Windows.Forms.TextBox]$StatusBox
  )

  $status = Invoke-LauncherAction -Action "status"
  if (-not $status) {
    $status = "No status output."
  }

  $StatusBox.Text = $status
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "xThat Launcher"
$form.Size = New-Object System.Drawing.Size(720, 480)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 23, 42)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$title = New-Object System.Windows.Forms.Label
$title.Text = "xThat Control Panel"
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 18)
$title.Location = New-Object System.Drawing.Point(24, 20)
$title.Size = New-Object System.Drawing.Size(360, 36)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Manage the server, open the app, and check logs."
$subtitle.Location = New-Object System.Drawing.Point(26, 58)
$subtitle.Size = New-Object System.Drawing.Size(420, 24)
$subtitle.ForeColor = [System.Drawing.Color]::FromArgb(191, 219, 254)
$form.Controls.Add($subtitle)

$urlLabel = New-Object System.Windows.Forms.Label
$urlLabel.Text = "App URL: $(Get-AppUrl)"
$urlLabel.Location = New-Object System.Drawing.Point(26, 90)
$urlLabel.Size = New-Object System.Drawing.Size(520, 24)
$urlLabel.ForeColor = [System.Drawing.Color]::FromArgb(125, 211, 252)
$form.Controls.Add($urlLabel)

$statusBox = New-Object System.Windows.Forms.TextBox
$statusBox.Location = New-Object System.Drawing.Point(30, 130)
$statusBox.Size = New-Object System.Drawing.Size(650, 120)
$statusBox.Multiline = $true
$statusBox.ScrollBars = "Vertical"
$statusBox.ReadOnly = $true
$statusBox.BackColor = [System.Drawing.Color]::FromArgb(30, 41, 59)
$statusBox.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($statusBox)

$outputBox = New-Object System.Windows.Forms.TextBox
$outputBox.Location = New-Object System.Drawing.Point(30, 270)
$outputBox.Size = New-Object System.Drawing.Size(650, 140)
$outputBox.Multiline = $true
$outputBox.ScrollBars = "Vertical"
$outputBox.ReadOnly = $true
$outputBox.BackColor = [System.Drawing.Color]::FromArgb(2, 6, 23)
$outputBox.ForeColor = [System.Drawing.Color]::White
$form.Controls.Add($outputBox)

function New-ActionButton {
  param(
    [string]$Text,
    [int]$X,
    [scriptblock]$OnClick
  )

  $button = New-Object System.Windows.Forms.Button
  $button.Text = $Text
  $button.Location = New-Object System.Drawing.Point($X, 420)
  $button.Size = New-Object System.Drawing.Size(120, 32)
  $button.BackColor = [System.Drawing.Color]::FromArgb(14, 165, 233)
  $button.ForeColor = [System.Drawing.Color]::White
  $button.FlatStyle = "Flat"
  $button.Add_Click($OnClick)
  $form.Controls.Add($button)
}

New-ActionButton -Text "Start" -X 30 -OnClick {
  $outputBox.Text = Invoke-LauncherAction -Action "start-bg"
  $urlLabel.Text = "App URL: $(Get-AppUrl)"
  Update-StatusBox -StatusBox $statusBox
}

New-ActionButton -Text "Stop" -X 160 -OnClick {
  $outputBox.Text = Invoke-LauncherAction -Action "stop"
  Update-StatusBox -StatusBox $statusBox
}

New-ActionButton -Text "Restart" -X 290 -OnClick {
  $outputBox.Text = Invoke-LauncherAction -Action "restart"
  Update-StatusBox -StatusBox $statusBox
}

New-ActionButton -Text "Open App" -X 420 -OnClick {
  Start-Process (Get-AppUrl)
}

New-ActionButton -Text "Open Logs" -X 550 -OnClick {
  if (Test-Path $script:LogPath) {
    Start-Process notepad.exe $script:LogPath
  } elseif (Test-Path $script:ErrLogPath) {
    Start-Process notepad.exe $script:ErrLogPath
  } else {
    $outputBox.Text = "No log file exists yet."
  }
}

Update-StatusBox -StatusBox $statusBox
[void]$form.ShowDialog()

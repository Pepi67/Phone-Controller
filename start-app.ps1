$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$script:ExitCode = 0
$script:CurrentStep = "Preparing launcher"

function Write-Section {
    param([string]$Text)

    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Text)
    Write-Host $Text -ForegroundColor Gray
}

function Write-Ok {
    param([string]$Text)
    Write-Host $Text -ForegroundColor Green
}

function Write-Warn {
    param([string]$Text)
    Write-Host $Text -ForegroundColor Yellow
}

function Stop-Launcher {
    param(
        [string]$Step,
        [string]$Message
    )

    $script:CurrentStep = $Step
    throw [System.Exception]::new($Message)
}

function Ask-YesNo {
    param([string]$Prompt)

    while ($true) {
        $answer = Read-Host $Prompt
        switch -Regex ($answer.Trim()) {
            "^[Yy]$" { return $true }
            "^[Nn]$" { return $false }
            default { Write-Warn "Please answer Y or N." }
        }
    }
}

function Test-CommandVersion {
    param(
        [string]$Step,
        [string]$Command
    )

    $script:CurrentStep = $Step

    try {
        $output = & cmd.exe /d /c $Command 2>&1
        $exitCode = $LASTEXITCODE
        $text = ($output | Out-String).Trim()

        return [pscustomobject]@{
            Ok       = ($exitCode -eq 0)
            ExitCode = $exitCode
            Output   = $text
        }
    }
    catch {
        return [pscustomobject]@{
            Ok       = $false
            ExitCode = -1
            Output   = $_.Exception.Message
        }
    }
}

function Invoke-CheckedCommand {
    param(
        [string]$Step,
        [string]$Command,
        [string]$WorkingDirectory
    )

    $script:CurrentStep = $Step

    if (-not (Test-Path -LiteralPath $WorkingDirectory -PathType Container)) {
        Stop-Launcher $Step "Working directory was not found: $WorkingDirectory"
    }

    Write-Info "Running: $Command"
    Write-Info "In: $WorkingDirectory"

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & cmd.exe /d /c $Command
        $exitCode = $LASTEXITCODE

        if ($exitCode -ne 0) {
            Stop-Launcher $Step "Command failed with exit code $exitCode`: $Command"
        }
    }
    finally {
        Pop-Location
    }
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $extraPaths = @(
        (Join-Path $env:ProgramFiles "nodejs"),
        (Join-Path $env:APPDATA "npm")
    )

    $env:Path = (@($machinePath, $userPath) + $extraPaths | Where-Object { $_ }) -join ";"
}

function Assert-FileExists {
    param(
        [string]$Step,
        [string]$Path,
        [string]$Message
    )

    $script:CurrentStep = $Step

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        Stop-Launcher $Step $Message
    }
}

function Start-AppWindow {
    param(
        [string]$Step,
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )

    $script:CurrentStep = $Step

    if (-not (Test-Path -LiteralPath $WorkingDirectory -PathType Container)) {
        Stop-Launcher $Step "Working directory was not found: $WorkingDirectory"
    }

    try {
        $process = Start-Process `
            -FilePath "cmd.exe" `
            -ArgumentList @("/k", "title $Title && $Command") `
            -WorkingDirectory $WorkingDirectory `
            -PassThru `
            -ErrorAction Stop

        if (-not $process) {
            Stop-Launcher $Step "Windows did not return a process for $Title."
        }

        Write-Ok "$Title window opened."
    }
    catch {
        Stop-Launcher $Step "Could not launch $Title. $($_.Exception.Message)"
    }
}

try {
    $ProjectRoot = $PSScriptRoot
    if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
        $ProjectRoot = Split-Path -Parent $PSCommandPath
    }

    Set-Location -LiteralPath $ProjectRoot
    $ClientRoot = Join-Path $ProjectRoot "client"

    Write-Section "Phone Controller Launcher"
    Write-Info "Project root: $ProjectRoot"

    Write-Section "Checking Node.js"
    $nodeCheck = Test-CommandVersion "Checking node --version" "node --version"
    $npmCheck = Test-CommandVersion "Checking npm --version" "npm --version"

    if (-not $nodeCheck.Ok -or -not $npmCheck.Ok) {
        Write-Warn "Node.js or npm was not found."

        if (-not $nodeCheck.Ok) {
            Write-Warn "node --version failed: $($nodeCheck.Output)"
        }

        if (-not $npmCheck.Ok) {
            Write-Warn "npm --version failed: $($npmCheck.Output)"
        }

        $installNode = Ask-YesNo "Node.js is missing. Do you want to install Node.js LTS with winget? [Y/N]"
        if (-not $installNode) {
            Stop-Launcher "Checking Node.js" "Cannot start Phone Controller without Node.js and npm."
        }

        $script:CurrentStep = "Checking winget"
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if (-not $winget) {
            Write-Warn "winget was not found on this PC."
            Write-Warn "Opening the Node.js download page..."
            $script:CurrentStep = "Opening Node.js download page"
            Start-Process "https://nodejs.org/en/download" | Out-Null
            Stop-Launcher "Checking winget" "Install Node.js LTS manually, then run start-app.bat again."
        }

        Invoke-CheckedCommand `
            -Step "Installing Node.js LTS with winget" `
            -Command "winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements" `
            -WorkingDirectory $ProjectRoot

        Write-Info "Refreshing PATH for this launcher..."
        Refresh-ProcessPath

        $nodeCheck = Test-CommandVersion "Verifying node --version after install" "node --version"
        $npmCheck = Test-CommandVersion "Verifying npm --version after install" "npm --version"

        if (-not $nodeCheck.Ok -or -not $npmCheck.Ok) {
            Stop-Launcher `
                "Verifying Node.js after winget install" `
                "Node.js/npm still was not found. Close this window, open a new one, and run start-app.bat again. If it still fails, install Node.js LTS from https://nodejs.org/en/download."
        }
    }

    Write-Ok "Node.js: $($nodeCheck.Output)"
    Write-Ok "npm: $($npmCheck.Output)"

    Write-Section "Checking dependencies"
    Assert-FileExists `
        -Step "Checking backend package.json" `
        -Path (Join-Path $ProjectRoot "package.json") `
        -Message "package.json was not found in the project root: $ProjectRoot"

    $backendNodeModules = Join-Path $ProjectRoot "node_modules"
    if (-not (Test-Path -LiteralPath $backendNodeModules -PathType Container)) {
        Write-Warn "Backend dependencies are missing."
        $installBackend = Ask-YesNo "Backend dependencies are missing. Run npm install? [Y/N]"

        if (-not $installBackend) {
            Stop-Launcher "Checking backend dependencies" "Cannot start backend without dependencies."
        }

        Invoke-CheckedCommand `
            -Step "Installing backend dependencies (npm install)" `
            -Command "npm install" `
            -WorkingDirectory $ProjectRoot
    }
    else {
        Write-Ok "Backend dependencies found."
    }

    Assert-FileExists `
        -Step "Checking frontend package.json" `
        -Path (Join-Path $ClientRoot "package.json") `
        -Message "client/package.json was not found. Make sure the React app exists inside the client folder."

    $frontendNodeModules = Join-Path $ClientRoot "node_modules"
    if (-not (Test-Path -LiteralPath $frontendNodeModules -PathType Container)) {
        Write-Warn "Frontend dependencies are missing."
        $installFrontend = Ask-YesNo "Frontend dependencies are missing. Run npm install in client? [Y/N]"

        if (-not $installFrontend) {
            Stop-Launcher "Checking frontend dependencies" "Cannot start frontend without dependencies."
        }

        Invoke-CheckedCommand `
            -Step "Installing frontend dependencies (client npm install)" `
            -Command "npm install" `
            -WorkingDirectory $ClientRoot
    }
    else {
        Write-Ok "Frontend dependencies found."
    }

    Write-Section "Starting servers"
    Start-AppWindow `
        -Step "Launching backend window (npm start)" `
        -Title "Phone Controller Backend" `
        -WorkingDirectory $ProjectRoot `
        -Command "npm start"

    Start-AppWindow `
        -Step "Launching frontend window (npm run dev)" `
        -Title "Phone Controller Frontend" `
        -WorkingDirectory $ClientRoot `
        -Command "npm run dev -- --host 0.0.0.0"

    Write-Host ""
    Write-Ok "Backend:  http://localhost:3000"
    Write-Ok "Frontend: http://localhost:5173"
    Write-Host ""
    Write-Info "Use the Network URL shown by Vite in the frontend window on your phone."
    Write-Host ""
    Write-Ok "Phone Controller started. You can close this window if both server windows are running."
}
catch {
    $script:ExitCode = 1

    Write-Host ""
    Write-Host "ERROR during step:" -ForegroundColor Red
    Write-Host "  $script:CurrentStep" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    Write-Host ""
    Read-Host "Press Enter to exit" | Out-Null
}

exit $script:ExitCode

<#
  灵感库 PromptVault —— 本地预览服务器（零依赖，纯 PowerShell）
  用途：在电脑上跑起来，手机连同一个 WiFi 就能打开；也可以用来验证 PWA 安装。
  用法：
    .\start.ps1                 # 默认 8080 端口，自动打开浏览器
    .\start.ps1 -Port 8081      # 换端口
    .\start.ps1 -NoOpen         # 不自动打开浏览器
  停止：按 Ctrl+C
#>
[CmdletBinding()]
param(
  [int]$Port = 8080,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$root  = [System.IO.Path]::GetFullPath($PSScriptRoot)
$index = Join-Path $root 'index.html'
if (-not (Test-Path -LiteralPath $index)) {
  Write-Host '找不到 index.html：请把本脚本放在 PromptVault 应用目录里再运行。' -ForegroundColor Red
  exit 1
}

$mime = @{
  '.html'        = 'text/html; charset=utf-8'
  '.htm'         = 'text/html; charset=utf-8'
  '.js'          = 'text/javascript; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.jpg'         = 'image/jpeg'
  '.jpeg'        = 'image/jpeg'
  '.webp'        = 'image/webp'
  '.gif'         = 'image/gif'
  '.ico'         = 'image/x-icon'
  '.txt'         = 'text/plain; charset=utf-8'
  '.md'          = 'text/plain; charset=utf-8'
  '.map'         = 'application/json; charset=utf-8'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
try {
  $listener.Start()
} catch {
  Write-Host ("端口 {0} 无法使用（可能被占用）。换个端口： .\start.ps1 -Port 8081" -f $Port) -ForegroundColor Red
  exit 1
}

$ips = @()
try {
  $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
    ForEach-Object { $_.IPAddressToString } |
    Where-Object { $_ -notlike '127.*' -and $_ -notlike '169.254.*' }
} catch { }

Write-Host ''
Write-Host '  灵感库 PromptVault 已在运行' -ForegroundColor Green
Write-Host ("  电脑：   http://localhost:{0}/" -f $Port)
foreach ($ip in $ips) {
  Write-Host ("  手机：   http://{0}:{1}/   （手机与电脑需在同一 WiFi）" -f $ip, $Port)
}
Write-Host '  按 Ctrl+C 停止'
Write-Host ''

if (-not $NoOpen) {
  try { Start-Process ("http://localhost:{0}/" -f $Port) | Out-Null } catch { }
}

$rootPrefix = $root.TrimEnd('\') + '\'

function Send-Bytes {
  param($Stream, [string]$Head, [byte[]]$Body, [bool]$HeadOnly)
  $headBytes = [System.Text.Encoding]::ASCII.GetBytes($Head)
  $Stream.Write($headBytes, 0, $headBytes.Length)
  if (-not $HeadOnly -and $Body) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

while ($true) {
  $client = $null
  try {
    $client = $listener.AcceptTcpClient()
    $client.ReceiveTimeout = 5000
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000

    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 2048, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) { $client.Close(); continue }
    while ($true) {
      $line = $reader.ReadLine()
      if ($null -eq $line -or $line -eq '') { break }
    }

    $parts  = $requestLine.Split(' ')
    $method = $parts[0].ToUpperInvariant()
    $raw    = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $path   = ($raw -split '\?')[0]
    try { $path = [System.Uri]::UnescapeDataString($path) } catch { }
    if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
    if ($path -match '\.\.') { $path = '/index.html' }

    $rel  = $path.TrimStart('/').Replace('/', '\')
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))

    if (-not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      $b = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      Send-Bytes $stream "HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($b.Length)`r`nConnection: close`r`n`r`n" $b ($method -eq 'HEAD')
    }
    elseif (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $b = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found: ' + $path)
      Send-Bytes $stream "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($b.Length)`r`nConnection: close`r`n`r`n" $b ($method -eq 'HEAD')
    }
    else {
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $ct  = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $cache = if ($ext -eq '.html') { 'no-cache' } else { 'public, max-age=60' }
      $head  = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: $cache`r`nService-Worker-Allowed: /`r`nConnection: close`r`n`r`n"
      Send-Bytes $stream $head $bytes ($method -eq 'HEAD')
    }
  }
  catch {
    # 浏览器提前断开属于正常现象，忽略
  }
  finally {
    if ($client) { try { $client.Close() } catch { } }
  }
}

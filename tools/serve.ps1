# Local web server for the presentation - needs no Python and no administrator rights.
# It only listens on this computer (localhost). Started by start.bat.
param([int]$Port = 8766, [switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
  '.webp' = 'image/webp'; '.mp4' = 'video/mp4'; '.mp3' = 'audio/mpeg'; '.woff2' = 'font/woff2'; '.woff' = 'font/woff'
}

# find a free port (8766, 8767, ...)
$listener = $null
for ($p = $Port; $p -lt $Port + 30; $p++) {
  $l = New-Object System.Net.HttpListener
  $l.Prefixes.Add("http://localhost:$p/")
  try { $l.Start(); $listener = $l; $Port = $p; break } catch { $l.Close() }
}
if (-not $listener) {
  Write-Host 'Could not open a local port. Close other programs and try again.' -ForegroundColor Red
  exit 1
}

$url = "http://localhost:$Port/"
Write-Host ''
Write-Host '  sarv - presentation is running' -ForegroundColor White
Write-Host "  $url" -ForegroundColor Yellow
Write-Host '  Keep this window open while presenting. Close it to stop.' -ForegroundColor DarkGray
Write-Host ''
if (-not $NoBrowser) { Start-Process $url }

# each request is answered on its own thread so videos never block the page
$handler = {
  param($ctx, $root, $mime)
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
    if ($rel -eq '' -or $rel.EndsWith('/')) { $rel = $rel + 'index.html' }
    $path = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $rel))
    if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not [IO.File]::Exists($path)) {
      $res.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes('Not found')
      $res.ContentLength64 = $b.Length
      $res.OutputStream.Write($b, 0, $b.Length)
      return
    }
    $ext = [IO.Path]::GetExtension($path).ToLower()
    if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
    $res.Headers['Cache-Control'] = 'no-store'
    $res.Headers['Accept-Ranges'] = 'bytes'
    $fs = [IO.File]::Open($path, 'Open', 'Read', 'ReadWrite')
    try {
      $len = $fs.Length; $start = [int64]0; $end = $len - 1
      $range = $req.Headers['Range']
      if ($range -and $range -match 'bytes=(\d*)-(\d*)') {
        if ($matches[1] -ne '') { $start = [int64]$matches[1]; if ($matches[2] -ne '') { $end = [int64]$matches[2] } }
        elseif ($matches[2] -ne '') { $start = $len - [int64]$matches[2] }
        if ($end -ge $len) { $end = $len - 1 }
        if ($start -lt 0) { $start = 0 }
        $res.StatusCode = 206
        $res.Headers['Content-Range'] = "bytes $start-$end/$len"
      }
      $count = $end - $start + 1
      $res.ContentLength64 = $count
      if ($req.HttpMethod -ne 'HEAD') {
        [void]$fs.Seek($start, 'Begin')
        $buf = New-Object byte[] 262144
        $left = $count
        while ($left -gt 0) {
          $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $left))
          if ($n -le 0) { break }
          $res.OutputStream.Write($buf, 0, $n)
          $left -= $n
        }
      }
    } finally { $fs.Close() }
  } catch {
    # the browser cancelled the request (normal for videos) - ignore
  } finally {
    try { $res.OutputStream.Close() } catch {}
    try { $res.Close() } catch {}
  }
}

$pool = [RunspaceFactory]::CreateRunspacePool(1, 24)
$pool.Open()
$jobs = New-Object System.Collections.ArrayList
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $ps = [PowerShell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($handler).AddArgument($ctx).AddArgument($root).AddArgument($mime)
    [void]$jobs.Add(@{ ps = $ps; h = $ps.BeginInvoke() })
    for ($i = $jobs.Count - 1; $i -ge 0; $i--) {
      if ($jobs[$i].h.IsCompleted) {
        try { [void]$jobs[$i].ps.EndInvoke($jobs[$i].h) } catch {}
        $jobs[$i].ps.Dispose(); $jobs.RemoveAt($i)
      }
    }
  }
} finally {
  $listener.Stop(); $pool.Close()
}

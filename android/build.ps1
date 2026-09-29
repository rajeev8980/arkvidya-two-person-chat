# Builds android/build/Arkvidya.apk without Gradle, using the local Android SDK
# and JDK. The signing key is created on first run and must be kept: Android
# only accepts updates signed with the same key.
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$buildTools = Get-ChildItem "$sdk\build-tools" -Directory | Sort-Object { [version]$_.Name } | Select-Object -Last 1 -ExpandProperty FullName
$androidJar = "$sdk\platforms\android-35\android.jar"
$jdk = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { Get-ChildItem "$env:USERPROFILE\.jdks" -Directory | Select-Object -Last 1 -ExpandProperty FullName }
$env:JAVA_HOME = $jdk

$build = "$root\build"
$keystore = "$root\arkvidya.keystore"
$keyProps = "$root\keystore.properties"

function Run($exe, [string[]]$argList) {
  & $exe @argList
  if ($LASTEXITCODE -ne 0) { throw "$exe failed with exit code $LASTEXITCODE" }
}

Remove-Item -Recurse -Force $build -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$build\classes", "$build\dex" | Out-Null

New-Item -ItemType Directory -Force "$root\res\mipmap-xxxhdpi" | Out-Null
Copy-Item "$root\..\public\icons\icon-192.png" "$root\res\mipmap-xxxhdpi\ic_launcher.png" -Force
Copy-Item "$root\..\public\icons\icon-512.png" "$root\res\mipmap-xxxhdpi\ic_launcher_foreground.png" -Force

Run "$buildTools\aapt2.exe" @("compile", "--dir", "$root\res", "-o", "$build\res.zip")
Run "$buildTools\aapt2.exe" @("link", "-o", "$build\unsigned.apk", "-I", $androidJar,
  "--manifest", "$root\AndroidManifest.xml", "--min-sdk-version", "24", "--target-sdk-version", "34",
  "$build\res.zip")

$sources = Get-ChildItem "$root\src" -Recurse -Filter *.java | ForEach-Object { $_.FullName }
Run "$jdk\bin\javac.exe" (@("--release", "11", "-classpath", $androidJar, "-d", "$build\classes") + $sources)

$classes = Get-ChildItem "$build\classes" -Recurse -Filter *.class | ForEach-Object { $_.FullName }
Run "$buildTools\d8.bat" (@("--release", "--min-api", "24", "--lib", $androidJar, "--output", "$build\dex") + $classes)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open("$build\unsigned.apk", "Update")
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "$build\dex\classes.dex", "classes.dex") | Out-Null
$zip.Dispose()

Run "$buildTools\zipalign.exe" @("-p", "-f", "4", "$build\unsigned.apk", "$build\aligned.apk")

if (-not (Test-Path $keystore)) {
  $password = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  Run "$jdk\bin\keytool.exe" @("-genkeypair", "-keystore", $keystore, "-alias", "arkvidya", "-keyalg", "RSA",
    "-keysize", "2048", "-validity", "10000", "-storepass", $password, "-keypass", $password,
    "-dname", "CN=Arkvidya Chat")
  Set-Content -Path $keyProps -Value "password=$password"
}
$password = ((Get-Content $keyProps) -replace "^password=", "")

Run "$buildTools\apksigner.bat" @("sign", "--ks", $keystore, "--ks-key-alias", "arkvidya",
  "--ks-pass", "pass:$password", "--key-pass", "pass:$password",
  "--out", "$build\Arkvidya.apk", "$build\aligned.apk")
Run "$buildTools\apksigner.bat" @("verify", "$build\Arkvidya.apk")

Write-Host "Built $build\Arkvidya.apk"

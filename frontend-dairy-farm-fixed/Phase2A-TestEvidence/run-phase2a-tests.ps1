$ErrorActionPreference = "Continue"
$root  = "c:\Users\allah\Downloads\frontend-dairy-farm-fixed (1)\frontend-dairy-farm-fixed"
$api   = Join-Path $root "backend"
$cnf   = Join-Path $env:TEMP "dairy_cnf.cnf"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$base  = "http://127.0.0.1:5081"
$res   = "c:\Users\allah\Downloads\frontend-dairy-farm-fixed (1)\frontend-dairy-farm-fixed\R1.txt"
$out   = New-Object System.Collections.ArrayList

function L($s) { [void]$out.Add([string]$s); Set-Content $res ($out -join "`n") -Encoding utf8 }
function Q($sql) { (& $mysql "--defaults-extra-file=$cnf" --database="dairy farm 1" --batch --skip-column-names -e $sql 2>&1) -join " " }
function S($s, $n=170) { if ($null -eq $s) { return "" }; $s=[string]$s; if ($s.Length -gt $n) { $s.Substring(0,$n)+"..." } else { $s } }

function Req($m,$u,$body,$tok) {
  $h = @{ "Accept" = "application/json" }
  if ($tok) { $h["Authorization"] = "Bearer $tok" }
  try {
    $p = @{ Uri = ($base+$u); Method = $m; Headers = $h; UseBasicParsing = $true; TimeoutSec = 30 }
    if ($body -ne $null) { $p["Body"] = $body; $p["ContentType"] = "application/json" }
    $r = Invoke-WebRequest @p
    return @{ code = [int]$r.StatusCode; body = $r.Content; type = $r.Headers["Content-Type"] }
  } catch {
    $c = 0; $b = ""; $t = ""
    try { $c = [int]$_.Exception.Response.StatusCode; $t = $_.Exception.Response.Headers["Content-Type"] } catch {}
    try { $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $b = $sr.ReadToEnd() } catch {}
    return @{ code = $c; body = $b; type = $t }
  }
}

function Up($file,$bytes,$mime,$tok) {
  $tmp = Join-Path $env:TEMP $file
  [IO.File]::WriteAllBytes($tmp, $bytes)
  # Build an argument ARRAY so curl receives -H and the header as two
  # separate arguments. Passing them as one string silently breaks the header.
  $args = @("-s", "-o", "NUL", "-w", "%{http_code}",
            "-X", "POST", "$base/api/animals/$newId/photo?makePrimary=true")
  if ($tok) { $args += @("-H", "Authorization: Bearer $tok") }
  $args += @("-F", "file=@$tmp;type=$mime")
  & curl.exe @args
}

# ---- secrets: in memory only, never written to disk, never printed ----
$jwtKey    = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
$ownerPw   = [Guid]::NewGuid().ToString("N") + "Aa1!" + [Guid]::NewGuid().ToString("N").Substring(0,8)
$ownerMail = "phase2a-test@example.invalid"

$src = "C:\Users\allah\Downloads\dairy_farm_software_ALL_MODULE_SAVE_FIXES_v6_AUTH_FIXED (2)\dairy_farm_software_ALL_MODULE_SAVE_FIXES_v6_AUTH_FIXED\dairy farn softwere\backend\appsettings.json"
$cs = (Get-Content $src -Raw | ConvertFrom-Json).ConnectionStrings.DairyFarm
$u  = (($cs -split ";") | Where-Object { $_ -match "^\s*User\s*=" })     -replace "^\s*User\s*=\s*",""
$pw = (($cs -split ";") | Where-Object { $_ -match "^\s*Password\s*=" }) -replace "^\s*Password\s*=\s*",""
Set-Content $cnf "[client]`r`nhost=localhost`r`nport=3306`r`nuser=$u`r`npassword=$pw`r`n" -Encoding ascii

# Clean slate. Both animal_status_history.user_id and animal_photos.uploaded_by
# are FKs to users, so those references must be cleared first or the DELETE
# fails on the foreign key constraint.
Q "UPDATE animal_status_history SET user_id = NULL WHERE user_id IS NOT NULL" | Out-Null
Q "UPDATE animal_photos SET uploaded_by = NULL WHERE uploaded_by IS NOT NULL" | Out-Null
Q "DELETE FROM user_roles" | Out-Null
Q "DELETE FROM users" | Out-Null

$env:ConnectionStrings__DairyFarm = ($cs -replace "Database=dairy_farm","Database=dairy farm 1")
$env:Jwt__Key = $jwtKey
$env:Jwt__Issuer = "PunjabPureDairy.Api"
$env:Jwt__Audience = "PunjabPureDairy.Frontend"
$env:Jwt__ExpiryMinutes = "60"
$env:ASPNETCORE_ENVIRONMENT = "Production"
$env:Logging__LogLevel__Microsoft_EntityFrameworkCore = "Warning"
$env:INITIAL_OWNER_EMAIL = $ownerMail
$env:INITIAL_OWNER_PASSWORD = $ownerPw
$env:INITIAL_OWNER_NAME = "Phase2A Test"

L "=== 0. BASELINE ==="
L ("animals=" + (Q "SELECT COUNT(*) FROM animals") + " history=" + (Q "SELECT COUNT(*) FROM animal_status_history") + " idents=" + (Q "SELECT COUNT(*) FROM animal_identifications") + " photos=" + (Q "SELECT COUNT(*) FROM animal_photos") + " users=" + (Q "SELECT COUNT(*) FROM users"))
L ("sequence: " + (Q "SELECT CONCAT(prefix,next_number) FROM animal_code_sequences WHERE farm_id=1"))

L ""
L "=== 1. BOOTSTRAP (opt-in only) ==="
$null = Start-Process -FilePath "dotnet" -ArgumentList "run","-c","Release","--no-build","--no-launch-profile","--","--bootstrap-owner" -WorkingDirectory $api -NoNewWindow -Wait -RedirectStandardOutput (Join-Path $env:TEMP "p1.txt") -RedirectStandardError (Join-Path $env:TEMP "p2.txt")
L ("users=" + (Q "SELECT COUNT(*) FROM users") + " owner_links=" + (Q "SELECT COUNT(*) FROM user_roles") + " hash_len=" + (Q "SELECT CHAR_LENGTH(password_hash) FROM users"))
$null = Start-Process -FilePath "dotnet" -ArgumentList "run","-c","Release","--no-build","--no-launch-profile","--","--bootstrap-owner" -WorkingDirectory $api -NoNewWindow -Wait -RedirectStandardOutput (Join-Path $env:TEMP "p3.txt") -RedirectStandardError (Join-Path $env:TEMP "p4.txt")
L ("2nd run: " + (S (Get-Content (Join-Path $env:TEMP "p4.txt") -Raw) 110))
L ("users still=" + (Q "SELECT COUNT(*) FROM users"))

Remove-Item Env:INITIAL_OWNER_PASSWORD,Env:INITIAL_OWNER_EMAIL,Env:INITIAL_OWNER_NAME -ErrorAction SilentlyContinue

$null = Start-Process -FilePath "dotnet" -ArgumentList "run","-c","Release","--no-build","--no-launch-profile","--urls","http://127.0.0.1:5081" -WorkingDirectory $api -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $env:TEMP "srv_o.txt") -RedirectStandardError (Join-Path $env:TEMP "srv_e.txt")
$up = $false
for ($i=0; $i -lt 50; $i++) { Start-Sleep -Milliseconds 700; if ((Get-NetTCPConnection -LocalPort 5081 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0) { $up = $true; break } }
L ("api_up=$up")
if (-not $up) { L (S (Get-Content (Join-Path $env:TEMP "srv_e.txt") -Raw) 600); return }

L ""
L "=== 2. AUTH ==="
$lg = Req "POST" "/api/auth/login" (@{email=$ownerMail;password=$ownerPw}|ConvertTo-Json) $null
$tok = $null
L ("valid login     : " + $lg.code)
if ($lg.code -eq 200) { $d = $lg.body|ConvertFrom-Json; $tok = $d.data.token; L ("  token_len=" + $tok.Length + " roles=" + ($d.data.user.roles -join ",")) }
L ("wrong password  : " + (Req "POST" "/api/auth/login" (@{email=$ownerMail;password="nope"}|ConvertTo-Json) $null).code)
L ("unknown user    : " + (Req "POST" "/api/auth/login" (@{email="ghost@x.invalid";password="nope"}|ConvertTo-Json) $null).code)
L ("missing password: " + (Req "POST" "/api/auth/login" (@{email=$ownerMail}|ConvertTo-Json) $null).code)
L ("hash leaked?    : " + $(if ($lg.body -match "passwordHash|password_hash") { "YES - PROBLEM" } else { "no" }))
L ("me valid        : " + (Req "GET" "/api/auth/me" $null $tok).code)
L ("me bad token    : " + (Req "GET" "/api/auth/me" $null "bad.token.here").code)
L ("me no token     : " + (Req "GET" "/api/auth/me" $null $null).code)

L ""
L "=== 3. UNAUTH WRITE => 401 ==="
L ("  POST   /api/animals            : " + (Req "POST" "/api/animals" '{"farmId":1,"sex":"FEMALE"}' $null).code)
L ("  PUT    /api/animals/1          : " + (Req "PUT" "/api/animals/1" '{"name":"x"}' $null).code)
L ("  PATCH  /api/animals/1/status   : " + (Req "PATCH" "/api/animals/1/status" '{"status":"SICK"}' $null).code)
L ("  DELETE /api/animals/1/photo/1  : " + (Req "DELETE" "/api/animals/1/photo/1" $null $null).code)

L ""
L "=== 4. CREATE ==="
$c1 = Req "POST" "/api/animals" '{"farmId":1,"name":"Phase2A Test Heifer","sex":"FEMALE","breedId":1,"dateOfBirth":"2024-03-15","groupId":1,"notes":"phase 2A test"}' $tok
$newId = $null
L ("create           : " + $c1.code + " " + (S $c1.body 200))
if ($c1.code -eq 201) { $newId = ($c1.body|ConvertFrom-Json).data.animalId }
L ("sequence now     : " + (Q "SELECT CONCAT(prefix,next_number) FROM animal_code_sequences WHERE farm_id=1"))
L ("animals count    : " + (Q "SELECT COUNT(*) FROM animals"))
if ($newId) { L ("new row          : " + (Q "SELECT CONCAT(animal_id,' ',animal_code,' ',sex,' ',status) FROM animals WHERE animal_id=$newId")) }
if ($newId) { L ("initial history  : " + (Q "SELECT CONCAT('old=',IFNULL(old_status,'NULL'),' new=',new_status,' user=',IFNULL(user_id,'NULL'),' reason=',IFNULL(reason,'NULL')) FROM animal_status_history WHERE animal_id=$newId")) }

L ""
L "=== 5. VALIDATION ==="
L ("dup code         : " + (Req "POST" "/api/animals" '{"farmId":1,"animalCode":"AN-001","sex":"FEMALE"}' $tok).code + " (expect 409)")
L ("bad farm+sex     : " + (Req "POST" "/api/animals" '{"farmId":999,"sex":"XX"}' $tok).code)
L ("status=INACTIVE  : " + (Req "POST" "/api/animals" '{"farmId":1,"sex":"FEMALE","status":"INACTIVE"}' $tok).code + " (expect 400)")
L ("status=QUARANTINED: " + (Req "POST" "/api/animals" '{"farmId":1,"sex":"FEMALE","status":"QUARANTINED"}' $tok).code + " (expect 400)")
L ("status=QUARANTINE: " + (Req "POST" "/api/animals" '{"farmId":1,"sex":"MALE","status":"QUARANTINE"}' $tok).code + " (expect 201)")
L ("negative price   : " + (Req "POST" "/api/animals" '{"farmId":1,"sex":"FEMALE","purchasePrice":-5}' $tok).code + " (expect 400)")
$ear = Req "POST" "/api/animals" '{"farmId":1,"sex":"FEMALE","earTag":"TAG-DUP-1"}' $tok
$earId = $null
if ($ear.code -eq 201) { $earId = ($ear.body|ConvertFrom-Json).data.animalId }
L ("earTag create    : " + $ear.code)
L ("dup earTag       : " + (Req "POST" "/api/animals" '{"farmId":1,"sex":"FEMALE","earTag":"TAG-DUP-1"}' $tok).code + " (expect 400)")
L ("identifications  : " + (Q "SELECT GROUP_CONCAT(CONCAT(animal_id,':',type,'=',value) ORDER BY id SEPARATOR ' | ') FROM animal_identifications"))

L ""
L "=== 6. PUT ==="
if ($newId) {
  L ("put name        : " + (Req "PUT" "/api/animals/$newId" '{"name":"Renamed By Test"}' $tok).code)
  L ("  db            : " + (Q "SELECT CONCAT(name,' | ',status) FROM animals WHERE animal_id=$newId"))
  $p2 = Req "PUT" "/api/animals/$newId" '{"status":"DEAD"}' $tok
  L ("put WITH status : " + $p2.code + " (expect 400) " + (S $p2.body 130))
  L ("  status intact : " + (Q "SELECT status FROM animals WHERE animal_id=$newId"))
  L ("put missing     : " + (Req "PUT" "/api/animals/999999" '{"name":"x"}' $tok).code + " (expect 404)")
}

L ""
L "=== 7. PARENTAGE ==="
if ($newId) {
  L ("dam=self        : " + (Req "PUT" "/api/animals/$newId" ("{`"damId`":$newId}") $tok).code + " (expect 400)")
  if ($earId) { L ("dam==sire       : " + (Req "PUT" "/api/animals/$newId" ("{`"damId`":$earId,`"sireId`":$earId}") $tok).code + " (expect 400)") }
}

L ""
L "=== 8. STATUS PATCH ==="
if ($newId) {
  L ("before          : " + (Q "SELECT status FROM animals WHERE animal_id=$newId"))
  L ("ACTIVE->SICK    : " + (Req "PATCH" "/api/animals/$newId/status" '{"status":"SICK","reason":"Vet observed left hind lameness"}' $tok).code)
  L ("after           : " + (Q "SELECT status FROM animals WHERE animal_id=$newId"))
  L ("history row     : " + (Q "SELECT CONCAT('old=',IFNULL(old_status,'NULL'),' new=',new_status,' user=',IFNULL(user_id,'NULL'),' reason=',IFNULL(reason,'NULL')) FROM animal_status_history WHERE animal_id=$newId ORDER BY id DESC LIMIT 1"))
  L ("same status     : " + (Req "PATCH" "/api/animals/$newId/status" '{"status":"SICK"}' $tok).code + " (expect 400)")
  L ("status=INACTIVE : " + (Req "PATCH" "/api/animals/$newId/status" '{"status":"INACTIVE"}' $tok).code + " (expect 400)")
  L ("SICK->DEAD      : " + (Req "PATCH" "/api/animals/$newId/status" '{"status":"DEAD","reason":"Euthanasia after treatment failure"}' $tok).code)
  L ("final status    : " + (Q "SELECT status FROM animals WHERE animal_id=$newId"))
  L ("history chain   : " + (Q "SELECT GROUP_CONCAT(CONCAT(IFNULL(old_status,'NULL'),'->',new_status,'/u',IFNULL(user_id,'NULL'),'[',IFNULL(reason,'-'),']') ORDER BY id SEPARATOR ' | ') FROM animal_status_history WHERE animal_id=$newId"))
  L ("anon rows(new)  : " + (Q "SELECT IF(COUNT(*)=0,'none - all attributed','ANON: ' + COUNT(*)) FROM animal_status_history WHERE user_id IS NULL AND animal_id=$newId"))
}

L ""
L "=== 9. NO DELETE ==="
L ("DELETE /api/animals/:id auth   : " + (Req "DELETE" "/api/animals/$newId" $null $tok).code + " (expect 405)")
L ("DELETE /api/animals/:id noauth : " + (Req "DELETE" "/api/animals/$newId" $null $null).code + " (expect 405)")
L ("animals count    : " + (Q "SELECT COUNT(*) FROM animals"))
L ("no_delete trigger: " + (Q "SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='dairy farm 1' AND TRIGGER_NAME='trg_animals_no_delete'"))

L ""
L "=== 10. PHOTOS ==="
if ($newId) {
  $jpg  = [byte[]]@(0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46) + (1..500 | ForEach-Object { [byte]($_ % 251) })
  $png  = [byte[]]@(0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A) + (1..500 | ForEach-Object { [byte]($_ % 251) })
  $webp = [byte[]]@(0x52,0x49,0x46,0x46,0x00,0x00,0x00,0x00,0x57,0x45,0x42,0x50) + (1..500 | ForEach-Object { [byte]($_ % 251) })
  $txt  = [Text.Encoding]::UTF8.GetBytes("this is not an image at all, just text")
  # Allocate the oversized buffer directly. Building it with a per-item
  # pipeline is orders of magnitude slower and stalls the whole run.
  $big  = [byte[]]::new(2200000)
  $big[0] = 0xFF; $big[1] = 0xD8; $big[2] = 0xFF; $big[3] = 0xE0
  L ("jpeg upload     : " + (Up "p2a.jpg" $jpg "image/jpeg" $tok) + " (expect 200)")
  L ("png upload      : " + (Up "p2a.png" $png "image/png" $tok) + " (expect 200)")
  L ("webp upload     : " + (Up "p2a.webp" $webp "image/webp" $tok) + " (expect 200)")
  L ("oversized 2.1MB : " + (Up "p2a_big.jpg" $big "image/jpeg" $tok) + " (expect 413)")
  L ("text-as-jpeg    : " + (Up "p2a.txt" $txt "image/jpeg" $tok) + " (expect 400)")
  L ("png-as-jpeg     : " + (Up "p2a_m.png" $png "image/jpeg" $tok) + " (expect 400 - mime mismatch)")
  L ("no auth         : " + (Up "p2a_n.jpg" $jpg "image/jpeg" $null) + " (expect 401)")
  L ("db photo rows   : " + (Q "SELECT GROUP_CONCAT(CONCAT(photo_id,':',file_type,'/',file_size,'/pri',is_primary,'/by',IFNULL(uploaded_by,'-'))) FROM animal_photos ORDER BY photo_id"))
  L ("animals.photo   : " + (Q "SELECT IFNULL(photo,'NULL') FROM animals WHERE animal_id=$newId") + "  <- must be NULL")
  $g = Req "GET" "/api/animals/$newId/photo" $null $null
  L ("GET photo       : " + $g.code + " bytes=" + $g.body.Length + " ctype=" + $g.type)
  L ("GET photo 404   : " + (Req "GET" "/api/animals/999999/photo" $null $null).code)
}

L ""
L "=== 11. QR ==="
if ($newId) {
  $q1 = Req "POST" "/api/animals/$newId/qr" $null $tok
  $qt = $null
  L ("issue token     : " + $q1.code)
  if ($q1.code -eq 200) { $qt = ($q1.body|ConvertFrom-Json).data.token; L ("  token_len=" + $qt.Length + " (CSPRNG 256-bit base64url)") }
  $q2 = Req "GET" "/api/animals/qr/$qt" $null $null
  L ("resolve token   : " + $q2.code + " " + (S $q2.body 130))
  L ("resolve unknown : " + (Req "GET" "/api/animals/qr/no-such-token-value" $null $null).code + " (expect 404)")
  L ("QR rows         : " + (Q "SELECT CONCAT(animal_id,':',type,'=',LEFT(value,14),'...') FROM animal_identifications WHERE type='QR'"))
  L ("token==code?    : " + (Q "SELECT IF(EXISTS(SELECT 1 FROM animal_identifications WHERE type='QR' AND value IN (SELECT animal_code FROM animals)),'LEAK - BAD','no - independent of sequential code')"))
  L ("rotate          : " + (Req "POST" "/api/animals/$newId/qr/rotate" $null $tok).code)
}

L ""
L "=== 12. PHASE 1 REGRESSION ==="
foreach ($u in @("/api/health","/api/animals","/api/animals/1","/api/animals/by-code/AN-001","/api/breeds","/api/breeds/1","/api/breeds/by-name/Holstein%20Friesian","/api/farms","/api/farms/1","/api/animal-groups","/api/animal-groups/1","/api/sheds","/api/animals/1/identifications","/api/animals/1/status-history")) {
  $r = Req "GET" $u $null $null
  L ("  " + $r.code + "  " + $u.PadRight(38) + (S $r.body 55))
}
$h = Req "GET" "/api/health" $null $null
L ("  db: " + (S (($h.body|ConvertFrom-Json).data.database | ConvertTo-Json -Compress) 130))

L ""
L "=== 13. DB INTEGRITY ==="
L ("base_tables     : " + (Q "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='dairy farm 1' AND TABLE_TYPE='BASE TABLE'"))
L ("views           : " + (Q "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='dairy farm 1' AND TABLE_TYPE='VIEW'"))
L ("triggers        : " + (Q "SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='dairy farm 1'"))
L ("no_delete trig  : " + (Q "SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA='dairy farm 1' AND TRIGGER_NAME='trg_animals_no_delete'"))
L ("animals.photo ty: " + (Q "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='dairy farm 1' AND TABLE_NAME='animals' AND COLUMN_NAME='photo'"))
L ("milk_records    : " + (Q "SELECT COUNT(*) FROM milk_records") + " (expect 0)")
L ("health_records  : " + (Q "SELECT COUNT(*) FROM health_records") + " (expect 0)")
L ("animal_sales    : " + (Q "SELECT COUNT(*) FROM animal_sales") + " (expect 0)")
L ("sequence        : " + (Q "SELECT CONCAT(prefix,next_number) FROM animal_code_sequences WHERE farm_id=1"))
L "DONE"

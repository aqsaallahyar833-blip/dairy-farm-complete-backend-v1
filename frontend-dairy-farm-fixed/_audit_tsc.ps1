$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\allah\Downloads\dairy-farm-complete-backend-v1\frontend-dairy-farm-fixed'
node node_modules/typescript/bin/tsc --noEmit *> _audit_tsc.txt
"EXIT=$LASTEXITCODE" | Out-File _audit_tsc-exit.txt -Encoding ascii
"DONE" | Out-File _audit_tsc-sentinel.txt -Encoding ascii

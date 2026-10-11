$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\allah\Downloads\dairy-farm-complete-backend-v1\frontend-dairy-farm-fixed'
npx vite build *> _audit_build.txt
"EXIT=$LASTEXITCODE" | Out-File _audit_build-exit.txt -Encoding ascii
"DONE" | Out-File _audit_build-sentinel.txt -Encoding ascii

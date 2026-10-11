$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\allah\Downloads\dairy-farm-complete-backend-v1\frontend-dairy-farm-fixed'
node node_modules/typescript/bin/tsc --noEmit *> _tsc2.txt
"EXIT=$LASTEXITCODE" | Out-File _tsc2-exit.txt -Encoding ascii
"DONE" | Out-File _tsc2-sentinel.txt -Encoding ascii

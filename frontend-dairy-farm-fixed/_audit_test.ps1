$ErrorActionPreference = 'Continue'
Set-Location 'C:\Users\allah\Downloads\dairy-farm-complete-backend-v1\frontend-dairy-farm-fixed'
node testSuite.js *> _audit_test.txt
"EXIT=$LASTEXITCODE" | Out-File _audit_test-exit.txt -Encoding ascii
"DONE" | Out-File _audit_test-sentinel.txt -Encoding ascii

@echo off`ncurl.exe -s -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" --data-binary @login_body.json`n

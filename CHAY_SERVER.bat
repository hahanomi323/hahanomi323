@echo off
chcp 65001 >nul
title AutoShop Backend - SQL Server

echo.
echo  === AUTOSHOP BACKEND - SQL SERVER ===
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo  LOI: Chua cai Node.js!
    echo  Tai tai: https://nodejs.org
    pause
    exit
)
echo  Node.js OK

echo  Dang cai thu vien...
npm install
echo  Cai xong!

echo.
echo  Truoc khi chay, mo file .env va dien:
echo    DB_HOST = ten server SQL cua ban (vi du: localhost\SQLEXPRESS)
echo    DB_USER = sa (hoac user SQL cua ban)
echo    DB_PASS = mat khau SQL Server
echo    DB_NAME = autoshop
echo.
echo  Nhan phim bat ky de chay server...
pause >nul

node server.js
pause

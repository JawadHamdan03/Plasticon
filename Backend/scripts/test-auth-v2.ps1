#!/usr/bin/env pwsh

$TEST_RESULTS = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    try {
        $params = @{
            Uri = "http://localhost:8080$Endpoint"
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params["Body"] = $Body | ConvertTo-Json -Depth 3
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[PASS] $Name (Status: $statusCode)" -ForegroundColor Green
            $script:TEST_RESULTS += @{ Name = $Name; Status = "PASS"; Details = $statusCode }
            return $content
        } else {
            Write-Host "[FAIL] $Name (Expected: $ExpectedStatus, Got: $statusCode)" -ForegroundColor Red
            $script:TEST_RESULTS += @{ Name = $Name; Status = "FAIL"; Details = "Expected $ExpectedStatus, got $statusCode" }
            return $null
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[ERROR] $Name - $errorMsg" -ForegroundColor Red
        $script:TEST_RESULTS += @{ Name = $Name; Status = "ERROR"; Details = $errorMsg }
        return $null
    }
}

Write-Host "`n========================================"
Write-Host "AUTHENTICATION & AUTHORIZATION TEST"
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1
Write-Host "[1/10] Testing login with new admin..." -ForegroundColor Yellow
$loginResponse = Test-Endpoint `
    -Name "Login - New Admin (esawiaburakan@gmail.com)" `
    -Method "POST" `
    -Endpoint "/auth/login" `
    -Body @{
        email = "esawiaburakan@gmail.com"
        password = "0598032500"
    } `
    -ExpectedStatus 200

if ($loginResponse) {
    $adminToken = $loginResponse.token
    $adminRole = $loginResponse.role
    Write-Host "   Token found for role: $adminRole" -ForegroundColor Cyan
}

# Test 2
Write-Host "`n[2/10] Testing login with original admin..." -ForegroundColor Yellow
$adminLoginResponse = Test-Endpoint `
    -Name "Login - Original Admin (admin@plasticon.local)" `
    -Method "POST" `
    -Endpoint "/auth/login" `
    -Body @{
        email = "admin@plasticon.local"
        password = "Pass1234!"
    } `
    -ExpectedStatus 200

if ($adminLoginResponse) {
    $originalAdminToken = $adminLoginResponse.token
    Write-Host "   Token found for role: $($adminLoginResponse.role)" -ForegroundColor Cyan
}

# Test 3
Write-Host "`n[3/10] Testing forgot password endpoint..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Forgot Password - Send Reset Link" `
    -Method "POST" `
    -Endpoint "/auth/forgot-password" `
    -Body @{
        email = "esawiaburakan@gmail.com"
    } `
    -ExpectedStatus 200

# Test 4
Write-Host "`n[4/10] Testing email verification with invalid token..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Verify Email - Invalid Token (should fail)" `
    -Method "GET" `
    -Endpoint "/auth/verify-email?token=invalid_token_xyz" `
    -ExpectedStatus 401

# Test 5
Write-Host "`n[5/10] Testing user registration (requires admin token)..." -ForegroundColor Yellow
if ($adminToken) {
    Test-Endpoint `
        -Name "Register - New Worker (with admin token)" `
        -Method "POST" `
        -Endpoint "/auth/register" `
        -Headers @{
            "Authorization" = "Bearer $adminToken"
        } `
        -Body @{
            username = "testworker_new"
            email = "testworker@plasticon.local"
            password = "TestPass123!"
            role = "WORKER"
        } `
        -ExpectedStatus 201
}

# Test 6
Write-Host "`n[6/10] Testing register without admin token (should fail)..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Register - Without Auth Token (should fail)" `
    -Method "POST" `
    -Endpoint "/auth/register" `
    -Body @{
        username = "unautheduser"
        email = "unauthed@plasticon.local"
        password = "TestPass123!"
        role = "WORKER"
    } `
    -ExpectedStatus 401

# Test 7
Write-Host "`n[7/10] Testing login with non-existent user (should fail)..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Login - Non-existent User (should fail)" `
    -Method "POST" `
    -Endpoint "/auth/login" `
    -Body @{
        email = "nonexistent_xyz@plasticon.local"
        password = "SomePassword123!"
    } `
    -ExpectedStatus 401

# Test 8
Write-Host "`n[8/10] Testing reset password with invalid token (should fail)..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Reset Password - Invalid Token (should fail)" `
    -Method "POST" `
    -Endpoint "/auth/reset-password" `
    -Body @{
        token = "invalid_reset_token_xyz"
        newPassword = "NewPass123!"
    } `
    -ExpectedStatus 401

# Test 9
Write-Host "`n[9/10] Testing logout with admin token..." -ForegroundColor Yellow
if ($adminToken) {
    Test-Endpoint `
        -Name "Logout - With Admin Token" `
        -Method "POST" `
        -Endpoint "/auth/logout" `
        -Headers @{
            "Authorization" = "Bearer $adminToken"
        } `
        -ExpectedStatus 200
}

# Test 10
Write-Host "`n[10/10] Testing logout without token (should fail)..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Logout - Without Token (should fail)" `
    -Method "POST" `
    -Endpoint "/auth/logout" `
    -ExpectedStatus 401

# Summary
Write-Host "`n========================================"
Write-Host "TEST SUMMARY"
Write-Host "========================================`n" -ForegroundColor Cyan

$passCount = ($TEST_RESULTS | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($TEST_RESULTS | Where-Object { $_.Status -eq "FAIL" }).Count
$errorCount = ($TEST_RESULTS | Where-Object { $_.Status -eq "ERROR" }).Count
$totalTests = $TEST_RESULTS.Count

Write-Host "PASSED: $passCount" -ForegroundColor Green
Write-Host "FAILED: $failCount" -ForegroundColor Red
Write-Host "ERRORS: $errorCount" -ForegroundColor Yellow
Write-Host "TOTAL: $totalTests" -ForegroundColor Cyan

if ($failCount -eq 0 -and $errorCount -eq 0) {
    Write-Host "`nALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "`nSome tests failed or had errors." -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

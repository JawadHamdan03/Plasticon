#!/usr/bin/env pwsh

# Test results array
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
            $TEST_RESULTS += @{ Name = $Name; Status = "PASS"; Details = $statusCode }
            return $content
        } else {
            Write-Host "[FAIL] $Name (Expected: $ExpectedStatus, Got: $statusCode)" -ForegroundColor Red
            $TEST_RESULTS += @{ Name = $Name; Status = "FAIL"; Details = "Expected $ExpectedStatus, got $statusCode" }
            return $null
        }
    } catch {
        Write-Host "[ERROR] $Name - $($_.Exception.Message)" -ForegroundColor Red
        $TEST_RESULTS += @{ Name = $Name; Status = "ERROR"; Details = $_.Exception.Message }
        return $null
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "AUTHENTICATION & AUTHORIZATION TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Login with new admin
Write-Host "[1/10] Testing login with new admin..." -ForegroundColor Yellow
$loginResponse = Test-Endpoint `
    -Name "Login - New Admin (esawiaburakan@gmail.com)" `
    -Method "POST" `
    -Endpoint "/api/auth/login" `
    -Body @{
        email = "esawiaburakan@gmail.com"
        password = "0598032500"
    } `
    -ExpectedStatus 200

if ($loginResponse) {
    $adminToken = $loginResponse.token
    $adminRole = $loginResponse.role
    Write-Host "   Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "   Role: $adminRole" -ForegroundColor Cyan
    Write-Host ""
}

# Test 2: Login with original admin
Write-Host "[2/10] Testing login with original admin..." -ForegroundColor Yellow
$adminLoginResponse = Test-Endpoint `
    -Name "Login - Original Admin (admin@plasticon.local)" `
    -Method "POST" `
    -Endpoint "/api/auth/login" `
    -Body @{
        email = "admin@plasticon.local"
        password = "Pass1234!"
    } `
    -ExpectedStatus 200

if ($adminLoginResponse) {
    $originalAdminToken = $adminLoginResponse.token
    Write-Host "   Token: $($originalAdminToken.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "   Role: $($adminLoginResponse.role)" -ForegroundColor Cyan
    Write-Host ""
}

# Test 3: Request password reset (forgot password)
Write-Host "[3/10] Testing forgot password endpoint..." -ForegroundColor Yellow
$forgotResponse = Test-Endpoint `
    -Name "Forgot Password - Send Reset Link" `
    -Method "POST" `
    -Endpoint "/auth/forgot-password" `
    -Body @{
        email = "esawiaburakan@gmail.com"
    } `
    -ExpectedStatus 200

Write-Host ""

# Test 4: Verify email with invalid token
Write-Host "[4/10] Testing email verification with invalid token..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Verify Email - Invalid Token" `
    -Method "GET" `
    -Endpoint "/auth/verify-email?token=invalid_token" `
    -ExpectedStatus 401

Write-Host ""

# Test 5: Register new user (requires admin token)
Write-Host "[5/10] Testing user registration (admin only)..." -ForegroundColor Yellow
if ($adminToken) {
    $registerResponse = Test-Endpoint `
        -Name "Register - New Worker (with admin token)" `
        -Method "POST" `
        -Endpoint "/auth/register" `
        -Headers @{
            "Authorization" = "Bearer $adminToken"
        } `
        -Body @{
            username = "testworker1"
            email = "testworker1@plasticon.local"
            password = "TestPass123!"
            role = "WORKER"
        } `
        -ExpectedStatus 201
}

Write-Host ""

# Test 6: Try register without admin token
Write-Host "[6/10] Testing register without admin token (should fail)..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Register - Without Auth Token (should fail)" `
    -Method "POST" `
    -Endpoint "/api/auth/register" `
    -Body @{
        username = "unautheduser"
        email = "unauthed@plasticon.local"
        password = "TestPass123!"
        role = "WORKER"
    } `
    -ExpectedStatus 401

Write-Host ""

# Test 7: Login with non-existent user
Write-Host "[7/10] Testing login with non-existent user..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Login - Non-existent User (should fail)" `
    -Method "POST" `
    -Endpoint "/api/auth/login" `
    -Body @{
        email = "nonexistent@plasticon.local"
        password = "SomePassword123!"
    } `
    -ExpectedStatus 401

Write-Host ""

# Test 8: Reset password with invalid token
Write-Host "[8/10] Testing reset password with invalid token..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Reset Password - Invalid Token (should fail)" `
    -Method "POST" `
    -Endpoint "/auth/reset-password" `
    -Body @{
        token = "invalid_reset_token"
        newPassword = "NewPass123!"
    } `
    -ExpectedStatus 401

Write-Host ""

# Test 9: Logout (with valid token)
Write-Host "[9/10] Testing logout..." -ForegroundColor Yellow
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

Write-Host ""

# Test 10: Try accessing protected endpoint without token
Write-Host "[10/10] Testing protected endpoint without token..." -ForegroundColor Yellow
Test-Endpoint `
    -Name "Logout - Without Token (should fail)" `
    -Method "POST" `
    -Endpoint "/api/auth/logout" `
    -ExpectedStatus 401

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
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
    Write-Host "`nSome tests failed or had errors. Review above." -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

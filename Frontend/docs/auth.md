# Frontend Authentication Documentation

## Overview

This document explains all implemented authentication-related frontend work in the Plasticon client.

## Routing and Page Structure

Authentication routes are configured in `src/App.tsx`:

- `/login` -> Login page
- `/register` -> Register page
- `/forgot-password` -> Forgot password page
- `/reset-password` -> Reset password page
- `/verify-email` -> Verify email page
- `/dashboard` -> Protected dashboard page

Additional routing behavior:

- `/` redirects to `/login`
- Unknown routes redirect to `/login`
- Auth pages are wrapped with `AuthLayout`
- Dashboard is protected using `ProtectedRoute`

## Auth State and API Integration

Central auth logic is implemented in `src/context/AuthContext.tsx`.

### Stored session data

- Token key: `plasticon_token`
- User key: `plasticon_user`

### Implemented methods

- `signIn(values)`
  - Calls `POST /auth/login`
  - Stores token and user profile in localStorage
  - Reads role from backend response

- `register(values)`
  - Sends multipart `FormData` to `POST /auth/register`
  - Includes `Authorization: Bearer <token>` if available
  - Supports profile image upload

- `signOut()`
  - Clears auth token and user from memory/localStorage

## Login Page

Implemented in `src/pages/LoginPage.tsx`.

### Features

- Email + password inputs
- Remember me option (`plasticon_remember_me` flag)
- Error handling using backend error messages
- Direct link to forgot password page
- Direct link to register page
- Redirect to dashboard after successful login

## Register Page

Implemented in `src/pages/RegisterPage.tsx`.

### Access behavior

- Only admin can submit the registration form
- Non-admin users see informational message and disabled submit

### Supported fields

- Full name
- Username
- National ID
- Email
- Phone
- Role
- Shift ID
- Password
- Confirm password
- Profile image (optional)

### Client-side validations

- National ID: exactly 9 digits
- Username: 3-30 chars, only letters/numbers/underscore
- Phone: exactly 10 digits if entered
- Shift ID: positive integer if entered
- Password: minimum 8 characters
- Password and confirm password must match (checked in context)

### UX details

- Uses localized validation/error messages from `authCopy`
- Trims inputs before submission
- Supports file upload for profile image

## Forgot Password Page

Implemented in `src/pages/ForgotPasswordPage.tsx`.

### Features

- Calls `POST /auth/forgot-password`
- Displays success or error message
- Uses localized labels and messages
- If backend returns `resetUrl` (development fallback), displays a direct link: `Open reset link`

## Reset Password Page

Implemented in `src/pages/ResetPasswordPage.tsx`.

### Features

- Reads reset token from query string (`?token=...`)
- Calls `POST /auth/reset-password`
- Validates token presence
- Validates password confirmation match
- Shows success/error messages
- Redirects to login after successful reset

## Verify Email Page

Implemented in `src/pages/VerifyEmailPage.tsx`.

### Features

- Reads verify token from query string (`?token=...`)
- Calls `GET /auth/verify-email?token=...`
- Handles loading/success/error states
- Displays localized status messages
- Includes link back to login page

## Localization (Arabic/English)

Localization is centralized in `src/content/authCopy.ts`.

### Covered areas

- Login copy
- Register copy
- Validation messages
- Forgot/reset/verify labels and states
- Hero content and CTA
- Footer hints and route labels

Both English (`en`) and Arabic (`ar`) are implemented.

## Auth Layout and Language Persistence

Auth shell is implemented in `src/components/AuthLayout.tsx`.

### Features

- Shared two-panel auth layout
- Locale switcher (EN/AR)
- Persisted language choice in localStorage key: `plasticon_locale`
- Applies `dir="rtl"` for Arabic and `dir="ltr"` for English
- Shared hero section (brand, features, stats, CTA)

## Current End-to-End Frontend Auth Flow

1. User signs in from login page.
2. Session token/user are persisted.
3. Admin can navigate to register and create users.
4. New user can verify email through verify page link.
5. User can request forgot password.
6. User can reset password using token link.
7. Protected routes remain guarded by auth state.

## Notes

- Frontend expects backend endpoints under the same base URL configured in `src/lib/api.ts`.
- Error rendering uses `readApiError` to surface backend `message`/`error` payloads.
- If SMTP is unavailable in development, forgot-password fallback link is surfaced in UI when provided by backend.

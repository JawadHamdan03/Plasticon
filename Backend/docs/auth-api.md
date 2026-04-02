# Auth API

Base path: /auth

## POST /auth/register
- Access: ADMIN
- Content type: multipart/form-data
- Body fields:
  - nationalId (required)
  - fullName (required)
  - username (required)
  - password (required)
  - role (required, valid UserRole)
  - phone (optional)
  - email (optional)
  - idImage (optional)
  - profileImage (optional file upload)
  - shiftId (optional)
- Notes:
  - unique check includes nationalId, username, and optional email

## POST /auth/login
- Access: Public
- Body:
  - email
  - password
- Response includes:
  - name
  - email
  - token

## POST /auth/logout
- Access: WORKER, ENGINEER, ACCOUNTANT, ADMIN
- Behavior: invalidates session cookie/token

## Examples

Login request:

POST /auth/login
{
  "email": "admin@plasticon.local",
  "password": "Pass1234!"
}

Login response:

{
  "name": "System Admin",
  "email": "admin@plasticon.local",
  "token": "jwt_token_here"
}

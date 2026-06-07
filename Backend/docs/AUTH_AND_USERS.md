# Authentication & User Management

## User Roles

The system has four roles defined in the Prisma enum `UserRole`:

| Role | Access Level |
|---|---|
| `WORKER` | Factory floor: production, consumption, electricity, attendance, chat |
| `ENGINEER` | All worker access + maintenance, quality, spare parts, machine health |
| `ACCOUNTANT` | Financial modules: payroll, invoices, expenses, suppliers, budgets |
| `ADMIN` | Full access to everything including user management and settings |

---

## Registration Flow

New users cannot self-register. They must go through an approval process:

```
1. User visits /request-access
2. Submits name, email, role, department → POST /registration-requests
3. RegistrationRequest record created with status = PENDING
4. Admin receives notification (Socket.IO + push)
5. Admin visits /admin/registration-requests
6. Admin approves or rejects
7. On APPROVE → new User record created with hashed password
8. Email sent to user with login instructions
```

This prevents unauthorized access to the factory system.

---

## Login Flow

```
POST /auth/login  { email, password }
  → authController.login()
  → authServices.loginUser()
      → prisma.user.findUnique({ where: { email } })
      → bcrypt.compare(password, user.hashedPassword)
      → if match: jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" })
      → response sets:
          - httpOnly cookie: authToken=<jwt>
          - JSON body:        { token: <jwt>, user: { id, role, fullName } }
```

The token is sent both ways so web clients can use the cookie (automatic, CSRF-safe) and mobile clients can use the Authorization header.

---

## Auth Middleware — `authMiddleware.ts`

`authorizeRoles(allowedRoles: UserRole[])` is a factory function that returns an Express middleware:

```
Step 1: Extract token
  Check req.cookies.authToken first
  Fall back to Authorization: Bearer <token> header

Step 2: Verify JWT
  jwt.verify(token, JWT_SECRET)
  Throws if expired or tampered

Step 3: Load user from DB
  prisma.user.findUnique({ where: { id: decoded.id } })
  Returns 401 if user was deleted after token was issued

Step 4: Check role
  if (!allowedRoles.includes(user.role)) → 403 Access denied

Step 5: Attach to request
  req.user = { id, role }
  next() → controller runs
```

Every protected route calls this middleware before its controller. Example:

```typescript
router.post("/", authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN]), createMaintenance);
router.get("/", authorizeRoles([UserRole.ENGINEER, UserRole.ADMIN, UserRole.WORKER]), getAll);
```

---

## Email Verification Flow

```
1. POST /auth/register → User created with isVerified = false
2. emailService sends verification link with signed token
3. User clicks link → GET /auth/verify-email?token=<token>
4. authController verifies token → sets user.isVerified = true
5. User can now log in
```

---

## Password Reset Flow

```
1. POST /auth/forgot-password { email }
   → generates short-lived JWT (30 min) with { id, purpose: "reset" }
   → sends email with /reset-password?token=<jwt>

2. POST /auth/reset-password { token, newPassword }
   → verifies token + purpose
   → bcrypt.hash(newPassword)
   → prisma.user.update({ hashedPassword })
```

---

## Profile Management

`GET /profile` — returns current user's full profile  
`PATCH /profile` — updates name, phone, department, avatar photo  
`POST /profile/photo` — uploads a new avatar (multer, stored in `prisma/pictures/`)

Profile photos are served from the static `/pictures` route and the path is stored in `user.photoPath`.

---

## User Management (Admin)

`GET /users` — list all users (Admin only)  
`PATCH /users/:id` — update role, shift assignment, active status  
`DELETE /users/:id` — soft delete (sets `deletedAt`, does not remove data)

Soft delete preserves all historical records (attendance, payroll, production) tied to the user.

---

## Token Storage Strategy

| Client | Storage |
|---|---|
| Web frontend | httpOnly cookie (`authToken`) + `localStorage` key `plasticon_token` |
| Mobile app | Secure storage via Expo SecureStore |

The `localStorage` copy is read by frontend pages that call `authHeaders()` to build the `Authorization` header for REST calls. The cookie is the primary auth mechanism and is not accessible to JavaScript.

# Frontend Architecture

## Technology Stack

| Tool | Version / Purpose |
|---|---|
| React 18 | UI library |
| TypeScript | Type safety |
| Vite | Build tool + dev server (port 5173) |
| React Router v7 | Client-side routing |
| Tailwind CSS | Utility-class styling |
| Socket.IO Client | Real-time chat + notifications |
| Lucide React | Icon library |

---

## Entry Point Chain

```
index.html
  └── main.tsx
        └── <BrowserRouter>
              └── <App />
```

**`main.tsx`** mounts the React app into `#root`. It wraps everything in `<BrowserRouter>` so React Router works throughout the tree.

**`App.tsx`** is the root component. Its job is to layer the three global context providers, mount the global `AlertToaster`, enable lazy loading with `Suspense`, and declare every route.

---

## Provider Tree

```
<ThemeProvider>           ← manages dark/light mode, writes data-theme to <html>
  <LocaleProvider>        ← manages AR/EN locale, exposes useLocale() hook
    <AuthProvider>        ← manages user session, exposes useAuth() hook
      <AlertToaster />    ← global toast notification overlay
      <Suspense fallback={<PageLoader />}>
        <Routes>
          ...all routes
        </Routes>
      </Suspense>
    </AuthProvider>
  </LocaleProvider>
</ThemeProvider>
```

Every child component can access theme, locale, and auth state via their respective hooks anywhere in the tree.

---

## Context Providers

### `AuthContext.tsx`
- Reads `plasticon_token` from localStorage on startup
- Makes `GET /profile` to load the full user object
- Exposes `{ user, loading, login(), logout() }`
- `login()`: stores token in localStorage, sets user state
- `logout()`: clears token, redirects to `/login`
- Used by all route guards and components that need user info

### `LocaleContext.tsx`
- Stores locale (`"en"` or `"ar"`) in localStorage
- Exposes `{ locale, setLocale }`
- When locale is `"ar"`, sets `dir="rtl"` on the HTML element
- All pages use the `nav(en, ar)` helper: `const nav = (en, ar) => locale === "ar" ? ar : en`

### `ThemeContext.tsx`
- Stores theme (`"light"` or `"dark"`) in localStorage
- Writes `data-theme="dark"` attribute to `<html>` element
- CSS variables in `index.css` swap values based on this attribute
- Exposes `{ theme, toggleTheme }`

---

## Lazy Loading Strategy

All pages are loaded lazily to reduce initial bundle size:

```typescript
const MaintenancePage = lazy(() =>
  import("./pages/engineer/MaintenancePage").then(m => ({ default: m.MaintenancePage }))
);
```

The `.then(m => ({ default: m.X }))` pattern is needed for **named exports** — React.lazy requires a default export. Pages that already use `export default` don't need the `.then()` wrapper.

The `<Suspense fallback={<PageLoader />}>` at the App level shows a centered spinner while the chunk loads. Each chunk is typically 5–30 KB because Vite code-splits automatically.

---

## Route Guards

Three components protect routes based on authentication and role:

```typescript
// 1. Requires any logged-in user
<ProtectedRoute>
  <ProfilePage />
</ProtectedRoute>

// 2. Requires exactly role === ADMIN
<AdminOnlyRoute>
  <UsersAdminPage />
</AdminOnlyRoute>

// 3. Requires role to be in the allowedRoles list
<RoleProtectedRoute allowedRoles={["ACCOUNTANT", "ADMIN"]}>
  <FinancialDashboard />
</RoleProtectedRoute>
```

All three check `useAuth().user`. If the user is not logged in, they redirect to `/login`. If logged in but wrong role, they redirect to `/dashboard`.

---

## AppScaffold — The Main Layout

`components/AppScaffold.tsx` is the outer shell rendered by most pages after login. It provides:

- **Sidebar** with role-filtered navigation links
- **Top bar** with search, locale toggle, theme toggle, notification bell, user avatar
- **`<GlobalCommandSearch />`** — Cmd+K / Ctrl+K search overlay
- **Mobile-responsive**: sidebar collapses to a bottom drawer on small screens

The sidebar nav items are different per role. An `ENGINEER` sees maintenance/quality links; an `ACCOUNTANT` sees financial links; a `WORKER` sees a simpler menu.

---

## API Communication

All API calls share the same base URL defined in `src/lib/api.ts`:

```typescript
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080";
```

Pages include the JWT in every request using the `authHeaders()` helper:

```typescript
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const res = await fetch(`${API_BASE_URL}/maintenance`, {
  headers: authHeaders(),
  credentials: "include",   // also sends the httpOnly cookie
});
```

The `credentials: "include"` ensures the httpOnly `authToken` cookie is sent, which is the primary auth mechanism. The `Authorization` header is a belt-and-suspenders backup.

---

## Build Output

```
npm run build
  → Vite bundles all code
  → Output: Frontend/dist/
      ├── index.html
      ├── assets/index-[hash].js    (main bundle)
      ├── assets/[page]-[hash].js   (lazy chunks per page)
      └── assets/index-[hash].css
```

The `dist/` folder can be served from any static host or from the same Express server by adding a static middleware pointing to it.

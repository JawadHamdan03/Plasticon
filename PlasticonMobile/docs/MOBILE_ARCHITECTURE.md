# Mobile Architecture

## Technology Stack

| Tool | Purpose |
|---|---|
| React Native | Cross-platform mobile framework |
| Expo | Build toolchain, device APIs, push notifications |
| TypeScript | Type safety |
| React Navigation v6 | Screen navigation (stack + tab) |
| Expo SecureStore | Encrypted token storage |
| Expo Notifications | Push notification registration + handling |

---

## Project Structure

```
PlasticonMobile/
├── App.tsx                     Root component (wraps with providers)
├── app.json                    Expo config (app name, bundle ID, icon, permissions)
├── src/
│   ├── auth/
│   │   ├── AuthContext.tsx     User session management
│   │   └── storage.ts         SecureStore read/write helpers
│   ├── api/
│   │   ├── client.ts          Base API client (fetch wrapper with auth)
│   │   └── types.ts           Shared TypeScript interfaces
│   ├── components/             Reusable UI components (10 components)
│   ├── context/
│   │   ├── LocaleContext.tsx   AR/EN locale
│   │   └── ThemeContext.tsx    Dark/light theme
│   ├── navigation/             Navigation stack and role-based tabs
│   ├── notifications/
│   │   └── notificationService.ts  Expo push token registration
│   ├── screens/                All screens organized by role
│   └── theme/
│       └── index.ts            Color palette + spacing constants
```

---

## Root Component — `App.tsx`

```tsx
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

The provider order matters:
- `SafeAreaProvider` must be outermost (used by RootNavigator to consume insets)
- `ThemeProvider` and `LocaleProvider` are stateless on first render
- `AuthProvider` loads the stored token and resolves the user before navigation renders
- `NavigationContainer` requires all context above it to be ready

---

## API Client — `src/api/client.ts`

A wrapper around `fetch` that automatically attaches the auth token:

```typescript
import * as storage from "../auth/storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8080";
// 10.0.2.2 is the Android emulator alias for localhost

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await storage.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}
```

Screens import `apiRequest` and call it in `useEffect` or event handlers.

---

## Token Storage — `src/auth/storage.ts`

Uses **Expo SecureStore** so tokens are encrypted in the device keychain/keystore:

```typescript
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "plasticon_token";

export const storeToken  = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const getToken    = ()               => SecureStore.getItemAsync(TOKEN_KEY);
export const removeToken = ()               => SecureStore.deleteItemAsync(TOKEN_KEY);
```

On iOS, tokens are stored in the Keychain. On Android, they use EncryptedSharedPreferences.

---

## Auth Context — `src/auth/AuthContext.tsx`

```typescript
useEffect(() => {
  const loadUser = async () => {
    const token = await storage.getToken();
    if (!token) { setLoading(false); return; }

    try {
      const user = await apiRequest<User>("/profile");
      setUser(user);
    } catch {
      await storage.removeToken(); // token expired/invalid
    } finally {
      setLoading(false);
    }
  };
  void loadUser();
}, []);
```

While `loading` is true, `RootNavigator` shows a full-screen spinner. Once resolved, the navigator renders either the auth stack (no user) or the role-based tab navigator (user present).

---

## Theme System — `src/theme/index.ts`

```typescript
export const colors = {
  accent:       "#6366f1",
  background:   "#ffffff",
  surface:      "#f8fafc",
  textPrimary:  "#0f172a",
  textSecondary:"#64748b",
  tabBar:       "#ffffff",
  // ... dark mode equivalents
};
```

The `useAppTheme()` hook from `ThemeContext` returns the active color set. Screens use `c.textPrimary` etc. rather than hard-coded hex values, so the theme can toggle without rebuilding.

---

## Component Library — `src/components/`

| Component | Purpose |
|---|---|
| `AppTopBar` | Persistent top bar: logo, locale switch, theme toggle, notification bell |
| `ScreenHeader` | In-screen title + optional action button |
| `StatCard` | Gradient KPI card (mirrors the web design system) |
| `Card` | Surface container |
| `Button` | Styled TouchableOpacity |
| `Input` | Styled TextInput |
| `Badge` | Status pill |
| `EmptyState` | No-data placeholder |
| `LoadingOverlay` | Full-screen spinner |
| `index.ts` | Barrel re-export |

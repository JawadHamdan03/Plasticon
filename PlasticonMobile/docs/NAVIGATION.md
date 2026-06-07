# Navigation System

## Architecture Overview

The navigation is built with **React Navigation v6** using two levels:

```
RootNavigator
  ├── (no user) → AuthStack         (Stack Navigator)
  │     ├── Login
  │     ├── Register
  │     ├── ForgotPassword
  │     ├── ResetPassword
  │     ├── VerifyEmail
  │     └── RequestAccess
  │
  └── (user present) → AuthenticatedLayout
        ├── AppTopBar              (persistent, above everything)
        └── AppTabs (role-based)
              ├── WORKER     → WorkerTabs
              ├── ENGINEER   → EngineerTabs
              ├── ACCOUNTANT → AccountantTabs
              └── ADMIN      → AdminTabs
```

---

## `RootNavigator.tsx` — Decision Logic

```typescript
export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <ActivityIndicator size="large" color={colors.accent} />;
  }

  if (!user) {
    return <AuthStack />;
  }

  return <AuthenticatedLayout role={user.role} user={user} />;
}
```

**Step 1 — Loading:** While `AuthContext` is verifying the stored token against the backend, a full-screen spinner is shown. This prevents a flash of the login screen for users who are already authenticated.

**Step 2 — Unauthenticated:** The `AuthStack` is rendered. All screens in it use `headerShown: false` with `slide_from_right` animation, giving a native feel.

**Step 3 — Authenticated:** `AuthenticatedLayout` wraps everything in a flex column:
1. `AppTopBar` fills the top (including status bar padding via `useSafeAreaInsets().top`)
2. `SafeAreaInsetsContext.Provider` overrides `top: 0` for all children — so individual screens don't double-pad the top
3. `AppTabs` renders the role-specific tab navigator

---

## `AppTabs` — Role Switcher

```typescript
function AppTabs({ role }: { role: string }) {
  switch (role) {
    case "WORKER":     return <WorkerTabs />;
    case "ENGINEER":   return <EngineerTabs />;
    case "ACCOUNTANT": return <AccountantTabs />;
    case "ADMIN":      return <AdminTabs />;
    default:           return <WorkerTabs />;
  }
}
```

Each tab navigator is a completely different navigation tree, so an `ENGINEER` and an `ACCOUNTANT` see entirely different bottom tabs and screens.

---

## `AppTopBar` — Persistent Header

Present on every authenticated screen. Contains:
- **Company logo / app name**
- **Locale switch** (AR ↔ EN)
- **Theme toggle** (dark ↔ light)
- **Notification bell** with unread count badge
- **User avatar** — taps to open profile

The `AppTopBar` consumes the top safe area inset itself, so the underlying tab content starts below the status bar without additional padding.

---

## Auth Stack

```typescript
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail"    component={VerifyEmailScreen} />
      <Stack.Screen name="RequestAccess"  component={RequestAccessScreen} />
    </Stack.Navigator>
  );
}
```

All screens are unauthenticated. Pressing "back" from Register returns to Login. The `RequestAccess` screen lets users request an account (same as the web `/request-access` page).

---

## WorkerTabs

Worker has the simplest navigation — a bottom tab bar with 4-5 main sections covering daily tasks:

```
WorkerTabs
  ├── Work         WorkMenuScreen (hub with links to subtasks)
  ├── Production   ProductionScreen
  ├── Attendance   AttendanceScreen
  ├── Chat         ChatScreen
  └── More         PersonalMenuScreen (payroll, profile, notifications)
```

Worker screens also include: consumption, electricity recording, machine stops, shift handover.

---

## EngineerTabs

Engineer has more sections reflecting the broader technical scope:

```
EngineerTabs
  ├── Dashboard    EngineerDashScreen
  ├── Maintenance  MaintMenuScreen → [MaintenancePage, MaintSchedule, MaintCosts, WorkOrders]
  ├── Machines     MachMenuScreen → [MachineHealth, Lifecycle, TransferLog, Calibration]
  ├── Quality      QualMenuScreen → [QualityChecks, QualityTrends]
  └── More         EngineerMoreScreen → [SparePartsScreen, TechDocsScreen, RawAlerts, ...]
```

Each "menu" screen is a list of links to sub-screens — a nested navigation structure. This keeps the bottom tab count manageable while giving access to all 22 engineer screens.

---

## AccountantTabs

```
AccountantTabs
  ├── Dashboard    AccountantDashScreen / FinanceDashScreen
  ├── Finance      AccountantFinMenuScreen → [Expenses, Invoices, FinancialReports, ...]
  ├── HR           AccountantHRMenuScreen → [Payroll, Attendance, Performance, ...]
  ├── Operations   (suppliers, purchases, budget, etc.)
  └── More         AcctMoreScreen
```

---

## AdminTabs

Admin has the widest tab bar with access to all modules:

```
AdminTabs
  ├── Dashboard    AdminDashScreen
  ├── People       PeopleMenuScreen → [Users, Registration, Attendance, Payroll]
  ├── Operations   AdminOpsMenuScreen → [Production, Machines, Shifts, Warehouse, ...]
  ├── Finance      AdminFinMenuScreen → (all accountant screens)
  ├── Engineering  AdminEngMenuScreen → (all engineer screens)
  └── More         AdminMoreMenuScreen → [Settings, AuditLogs, Analytics, ...]
```

---

## Navigation Types — `src/navigation/types.ts`

TypeScript param list types for type-safe navigation:

```typescript
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { token?: string };
  RequestAccess: undefined;
};
```

Screens use `useNavigation<StackNavigationProp<AuthStackParamList>>()` for type-safe `navigate()` calls.

---

## Back Navigation

React Navigation's native stack handles back navigation automatically via:
- **Android:** hardware back button
- **iOS:** swipe from left edge

For screens that should block back navigation (e.g., forms with unsaved changes), a `beforeRemove` listener can be attached.

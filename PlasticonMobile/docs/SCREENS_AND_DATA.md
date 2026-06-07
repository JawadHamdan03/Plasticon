# Screens & Data Fetching

## Screen Organization

Screens are organized by role under `src/screens/`:

```
screens/
├── auth/        (6 screens — shared login flow)
├── admin/       (28 screens)
├── engineer/    (22 screens)
├── accountant/  (20 screens)
├── worker/      (19 screens)
└── shared/      (12 screens — accessible to multiple roles)
```

Shared screens (chat, notifications, attendance, profile, AI hub) are imported by multiple role navigators — one screen, multiple entry points.

---

## Standard Screen Pattern

Every data screen follows the same lifecycle:

```typescript
export function MaintenancePage() {
  const { t } = useLocale();                    // bilingual text
  const { colors: c } = useAppTheme();          // theme colors

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);  // pull-to-refresh

  useEffect(() => { void fetchRecords(); }, []);

  const fetchRecords = async () => {
    try {
      const data = await apiRequest<Maintenance[]>("/maintenance");
      setRecords(data ?? []);
    } catch (err) {
      // show error toast
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title={t("Maintenance")} />
      <FlatList
        data={records}
        keyExtractor={r => String(r.id)}
        renderItem={({ item }) => <MaintenanceCard record={item} />}
        ListEmptyComponent={<EmptyState message={t("No records")} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void fetchRecords(); }}
          />
        }
      />
    </View>
  );
}
```

Key elements:
- `LoadingOverlay` for initial load
- `FlatList` with `RefreshControl` for pull-to-refresh
- `ListEmptyComponent` for the no-data state
- `ScreenHeader` for consistent in-screen title

---

## Role-Specific Screen Highlights

### Worker Screens (19)

| Screen | Purpose |
|---|---|
| `WorkerHubScreen` | Daily task hub with quick-access cards |
| `ProductionScreen` | Log pieces + cartons produced per shift |
| `ConsumptionWorkerScreen` | Log raw material consumption |
| `ElectricityRecordScreen` | Log kWh meter readings |
| `MachineStopsScreen` | Report downtime events |
| `ShiftHandoverScreen` | AI-assisted shift handover notes |
| `DailyChecklistScreen` | End-of-shift task checklist |
| `SnapshotsScreen` | Historical worker performance snapshots |
| `PayrollScreen` | View own payroll summary |

### Engineer Screens (22)

| Screen | Purpose |
|---|---|
| `MaintenancePage` | Maintenance reports with downtime tracking |
| `MachineHealthScreen` | Machine efficiency and health records |
| `SparePartsScreen` | Spare part inventory + request management |
| `TechDocsScreen` | Technical documentation browser |
| `WorkOrdersScreen` | Active work orders management |
| `LifecycleScreen` | Equipment lifecycle tracking |
| `TransferLogScreen` | Equipment service and transfer log |
| `RawAlertsScreen` | Low-stock raw material alerts |
| `ProductionAnalyticsScreen` | Production trend charts |

### Accountant Screens (20)

| Screen | Purpose |
|---|---|
| `FinanceDashScreen` | Financial KPI dashboard |
| `ExpensesScreen` | Expense tracking + approval |
| `InvoicesScreen` | Invoice management + AI extraction |
| `SuppliersScreen` | Supplier catalog |
| `PartsPricingScreen` | Price spare part requests from engineers |
| `BudgetPlanningScreen` | Budget allocation tracking |
| `BankReconciliationScreen` | Bank vs. book balance reconciliation |
| `CustomerReceivablesScreen` | Track unpaid customer invoices |
| `SupplierPayablesScreen` | Track outstanding supplier payments |
| `EmployeePerformanceScreen` | Score employee performance |

### Shared Screens (12)

| Screen | Purpose |
|---|---|
| `ChatScreen` | Group messaging (all roles) |
| `NotificationsScreen` | Notification feed + read/unread |
| `AttendanceScreen` | Check-in / check-out |
| `ProfileScreen` | Edit profile, avatar upload |
| `AIHubScreen` | AI tools menu |
| `AssistantScreen` | RAG AI chat assistant |
| `AnomalyDetectionScreen` | AI anomaly analysis |
| `InvoiceExtractionScreen` | AI invoice data extraction |
| `MaintenanceReportScreen` | AI maintenance report generator |

---

## Form Screens (Create/Edit)

Some screens include an inline form panel that slides in:

```typescript
const [showForm, setShowForm] = useState(false);
const [form, setForm] = useState(emptyForm);

// Form is rendered as a Modal or animated panel below the list
<Modal visible={showForm} animationType="slide" presentationStyle="formSheet">
  <View>
    <ScreenHeader title="New Record" onBack={() => setShowForm(false)} />
    <TextInput
      value={form.title}
      onChangeText={v => setForm(p => ({ ...p, title: v }))}
    />
    <Button title="Save" onPress={() => void handleSave()} />
  </View>
</Modal>
```

Alternatively, forms are presented as a new stack screen pushed via `navigation.navigate("EditRecord", { id })`.

---

## Menu Screens (Hub Screens)

To avoid cramming too many tabs, several roles have "menu" screens that act as a sub-hub:

```typescript
// MaintMenuScreen.tsx
const menuItems = [
  { label: t("Maintenance Reports"), icon: "wrench",  route: "MaintenancePage" },
  { label: t("Preventive Schedule"),  icon: "calendar", route: "MaintScheduleScreen" },
  { label: t("Maintenance Costs"),    icon: "dollar",   route: "MaintCostsScreen" },
  { label: t("Work Orders"),          icon: "clipboard",route: "WorkOrdersScreen" },
];

return (
  <FlatList
    data={menuItems}
    renderItem={({ item }) => (
      <TouchableOpacity onPress={() => navigation.navigate(item.route)}>
        <Card style={styles.menuItem}>
          <Icon name={item.icon} />
          <Text>{item.label}</Text>
        </Card>
      </TouchableOpacity>
    )}
  />
);
```

---

## Analytics Screens

Screens like `ProductionAnalyticsScreen` fetch aggregated data:

```typescript
const [stats, setStats] = useState<ProductionStats | null>(null);

useEffect(() => {
  apiRequest<ProductionStats>("/production/analytics?period=30d")
    .then(setStats)
    .catch(console.error);
}, []);

// Render with StatCard components
<StatCard
  label={t("Total Pieces")}
  value={stats?.totalPieces ?? 0}
  gradient={["#3b82f6", "#1d4ed8"]}
/>
```

`StatCard` uses the same gradient design pattern as the web frontend for visual consistency across platforms.

---

## Error Handling

```typescript
try {
  await apiRequest("/endpoint");
} catch (err) {
  if (err.message.includes("401")) {
    // Token expired — log out
    await storage.removeToken();
    setUser(null);
  } else {
    // Show inline error
    setError(err.message);
  }
}
```

All screens handle `401` by clearing the token and redirecting to login via `AuthContext.logout()`.

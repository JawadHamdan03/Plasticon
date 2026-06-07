# Data Flow — Fetching, State & Real-Time

## How Pages Fetch Data

Every page follows the same data-fetching pattern:

```typescript
// 1. State setup
const [records, setRecords] = useState<MyModel[]>([]);
const [loading, setLoading] = useState(true);

// 2. Fetch on mount (and after mutations)
useEffect(() => { void fetchRecords(); }, []);

const fetchRecords = async () => {
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE_URL}/my-endpoint`, {
      headers: authHeaders(),   // adds Authorization: Bearer <token>
      credentials: "include",  // also sends httpOnly cookie
    });
    if (res.ok) {
      const data = await res.json();
      setRecords(data ?? []);
    }
  } catch { }
  finally { setLoading(false); }
};
```

Pages do **not** use a global state store (no Redux, no Zustand). Each page owns its own state and re-fetches after every successful create/update/delete. This keeps each page fully self-contained and easy to reason about.

---

## Auth Headers Helper

```typescript
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("plasticon_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

This helper is defined locally in every page file (not imported). The token was stored when the user logged in via `AuthContext.login()`.

---

## API Base URL — `src/lib/api.ts`

```typescript
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:8080";
```

Set `VITE_API_URL` in `.env` to point to a production server. Falls back to localhost for development.

The RAG server URL is a separate variable: `VITE_RAG_URL ?? "http://localhost:3001"`.

---

## Mutation Pattern (Create / Update / Delete)

### Create

```typescript
const handleSave = async () => {
  if (!form.title.trim()) return;  // client validation
  setSaving(true);
  try {
    const url = editingId
      ? `${API_BASE_URL}/records/${editingId}`
      : `${API_BASE_URL}/records`;

    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setShowForm(false);
      void fetchRecords();   // re-fetch to update the list
    }
  } catch { }
  finally { setSaving(false); }
};
```

The `editingId` state controls whether we're creating (`null`) or editing (a number). The same form and save handler handle both cases.

### Delete

```typescript
const handleDelete = async (id: number) => {
  // Show a custom confirm dialog (not browser's window.confirm)
  if (!(await confirmDialog("Delete this record?", { danger: true }))) return;

  await fetch(`${API_BASE_URL}/records/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    credentials: "include",
  });
  void fetchRecords();
};
```

`confirmDialog` is from `src/lib/dialog.ts` — it renders a styled modal instead of the browser's native confirm box, supporting the bilingual design system.

---

## Dialog Library — `src/lib/dialog.ts`

```typescript
export async function confirmDialog(
  message: string,
  options?: { danger?: boolean }
): Promise<boolean>
```

Returns a `Promise<boolean>`. Pages `await` it before performing destructive operations. The modal shows the message with "Confirm" and "Cancel" buttons; if `danger: true`, the Confirm button is red.

---

## Toast Notifications — `src/lib/toast.ts`

```typescript
import { toast } from "../lib/toast";

toast.success("Record saved successfully");
toast.error("Failed to delete — server error");
```

Toasts appear via `<AlertToaster />` (mounted in `App.tsx`). They auto-dismiss after a few seconds.

---

## Real-Time: Socket.IO Client — `src/lib/socket.ts`

The socket is initialized once and reused:

```typescript
import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

export const socket = io(API_BASE_URL, {
  auth: { token: `Bearer ${localStorage.getItem("plasticon_token")}` },
  autoConnect: false,
});
```

The socket auto-connects when a page that needs it mounts:

**ChatPage.tsx:**
```typescript
useEffect(() => {
  socket.connect();
  socket.emit("join:group", groupId);
  socket.on("chat:message", (msg) => setMessages(prev => [...prev, msg]));
  return () => {
    socket.emit("leave:group", groupId);
    socket.off("chat:message");
    socket.disconnect();
  };
}, [groupId]);
```

**NotificationsPage.tsx / AppScaffold:**
```typescript
socket.on("notification:new", (n) => {
  setNotifications(prev => [n, ...prev]);
  toast.info(n.title);
});
socket.on("notification:unread-count-updated", () => {
  void fetchUnreadCount();
});
```

---

## Form State Management

Forms use a single `form` state object with `useState`:

```typescript
const emptyForm = { title: "", type: "MONTHLY", period: "", pdfPath: "" };
const [form, setForm] = useState(emptyForm);

// Update a single field immutably
<input
  value={form.title}
  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
/>
```

Opening an edit form copies the existing record into `form`:

```typescript
const openEdit = (r: MyRecord) => {
  setEditingId(r.id);
  setForm({ title: r.title, type: r.type, period: r.period, pdfPath: r.pdfPath ?? "" });
  setShowForm(true);
};
```

Canceling clears the form by setting it back to `emptyForm`.

---

## Loading & Empty States

Every page wraps its data list in a three-way conditional:

```tsx
{loading ? (
  <div className="flex justify-center p-12">
    <div className="spinner" />
  </div>
) : records.length === 0 ? (
  <Card className="p-12 text-center text-[var(--text-secondary)]">
    <FileText size={32} className="mx-auto mb-3 opacity-30" />
    <p className="font-medium">{nav("No records found", "لا توجد سجلات")}</p>
    <p className="text-sm mt-1">{nav("Add the first record to get started", "أضف أول سجل للبدء")}</p>
  </Card>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {records.map(r => <RecordCard key={r.id} record={r} />)}
  </div>
)}
```

---

## File Uploads

Pages that need file upload (profile photo, tech documents, invoices) use `FormData`:

```typescript
const formData = new FormData();
formData.append("file", selectedFile);
formData.append("title", form.title);

const res = await fetch(`${API_BASE_URL}/tech-documents`, {
  method: "POST",
  headers: authHeaders(),  // NOTE: no Content-Type header — browser sets multipart boundary
  credentials: "include",
  body: formData,
});
```

The `PhotoUploadButton` component in `components/` encapsulates this logic for avatar uploads.

---

## Filtering

Most list pages support client-side filtering with a `<select>` or filter pills:

```typescript
const [filterType, setFilterType] = useState("");

const filtered = records.filter(r =>
  !filterType || r.type === filterType
);
```

All filtering happens on the already-fetched data — no extra API calls are made when changing filters.

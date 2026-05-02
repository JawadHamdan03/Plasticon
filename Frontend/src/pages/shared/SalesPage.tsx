import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Users, TrendingUp, DollarSign, Search, FileText, Pencil, Trash2, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { API_BASE_URL, readApiError } from "../../lib/api";
import { confirmDialog } from "../../lib/dialog";
import { ModulePageShell } from "../../components/ModulePageShell";

type CustomerOption = {
  id: number;
  name: string;
};

type SaleItem = {
  id: number;
  machineType: string;
  size: string;
  quantity: number;
  pricePerUnit: number;
};

type FileAttachment = {
  id: number;
  fileName: string;
  filePath: string;
  publicUrl?: string;
};

type SaleRecord = {
  id: number;
  customerId: number;
  date: string;
  totalAmount: number;
  invoiceImage: string;
  invoiceUrl?: string;
  customer?: {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: SaleItem[];
  fileAttachments?: FileAttachment[];
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
}

const toPublicFileUrl = (pathOrUrl?: string | null) => {
  if (!pathOrUrl || !pathOrUrl.trim()) {
    return "";
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (pathOrUrl.startsWith("/pictures/")) {
    return `${API_BASE_URL}${pathOrUrl}`;
  }

  const normalized = pathOrUrl
    .replace(/^prisma[\\/]+pictures[\\/]+/i, "")
    .replace(/^pictures[\\/]+/i, "")
    .replace(/^\/+/, "");

  return normalized ? `${API_BASE_URL}/pictures/${normalized}` : "";
};

const getRecordInvoiceUrl = (record: {
  invoiceUrl?: string;
  invoiceImage?: string;
  fileAttachments?: FileAttachment[];
}) => {
  if (record.invoiceUrl) {
    return toPublicFileUrl(record.invoiceUrl);
  }

  const invoiceAttachment = record.fileAttachments?.[0];
  if (invoiceAttachment?.publicUrl) {
    return toPublicFileUrl(invoiceAttachment.publicUrl);
  }

  if (invoiceAttachment?.filePath) {
    return toPublicFileUrl(invoiceAttachment.filePath);
  }

  return toPublicFileUrl(record.invoiceImage);
};

const formatMoney = (locale: string, value: number) =>
  "₪" + new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

export function SalesPage() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const canManageSales = user?.role === "ACCOUNTANT";

  const text = useMemo(
    () => ({
      title: isArabic ? "المبيعات" : "Sales",
      subtitle: isArabic
        ? "إدارة عمليات البيع مع عرض كامل للإدمن، والمحاسب يمكنه الإضافة والتعديل والحذف."
        : "Manage sales with full admin visibility while accountants can create, edit, and delete.",
      summaryCustomers: isArabic ? "الزبائن" : "Customers",
      summarySales: isArabic ? "عمليات البيع" : "Sales",
      summaryAmount: isArabic ? "إجمالي المبيعات" : "Total sales",
      refresh: isArabic ? "تحديث" : "Refresh",
      searchTitle: isArabic ? "ابحث في المبيعات" : "Search sales",
      searchPlaceholder: isArabic
        ? "الزبون، المقاس، نوع الماكينة، أو الفاتورة"
        : "Customer, size, machine type, or invoice",
      formTitle: isArabic ? "تفاصيل عملية البيع" : "Sale details",
      customer: isArabic ? "الزبون" : "Customer",
      selectCustomer: isArabic ? "اختر الزبون" : "Select customer",
      saleDate: isArabic ? "تاريخ البيع" : "Sale date",
      totalAmount: isArabic ? "إجمالي السعر" : "Total amount",
      items: isArabic ? "الأصناف" : "Items",
      machineType: isArabic ? "نوع الماكينة" : "Machine type",
      size: isArabic ? "المقاس" : "Size",
      quantity: isArabic ? "الكمية" : "Quantity",
      unitPrice: isArabic ? "سعر الوحدة" : "Unit price",
      addItem: isArabic ? "إضافة صنف" : "Add item",
      removeItem: isArabic ? "حذف الصنف" : "Remove item",
      invoice: isArabic
        ? "فاتورة/إرسالية (PDF/صورة)"
        : "Invoice/Delivery note (PDF/Image)",
      fileSelected: isArabic ? "الملف المحدد" : "Selected file",
      create: isArabic ? "إضافة بيع" : "Create sale",
      update: isArabic ? "حفظ التعديل" : "Save changes",
      cancel: isArabic ? "إلغاء التعديل" : "Cancel edit",
      listTitle: isArabic ? "سجل المبيعات" : "Sales ledger",
      noData: isArabic ? "لا توجد مبيعات" : "No sales yet",
      edit: isArabic ? "تعديل" : "Edit",
      delete: isArabic ? "حذف" : "Delete",
      confirmDelete: isArabic
        ? "هل أنت متأكد من حذف عملية البيع؟"
        : "Are you sure you want to delete this sale?",
      invoiceLink: isArabic ? "عرض الفاتورة" : "View invoice",
      actions: isArabic ? "إجراءات" : "Actions",
      deliveryPdf: isArabic ? "PDF الإرسالية" : "Delivery PDF",
      loading: isArabic ? "جارٍ التحميل..." : "Loading...",
    }),
    [isArabic],
  );

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [query, setQuery] = useState("");

  const [saleForm, setSaleForm] = useState({
    customerName: "",
    date: "",
    totalAmount: "",
    items: [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
  });
  const [saleInvoiceFile, setSaleInvoiceFile] = useState<File | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);

  const loadCustomers = useCallback(async () => {
    const response = await fetchWithAuth("/sales/customers");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setCustomers((await response.json()) as CustomerOption[]);
  }, []);

  const loadSales = useCallback(async () => {
    const response = await fetchWithAuth("/sales/all");
    if (!response.ok) {
      throw new Error(await readApiError(response));
    }
    setSales((await response.json()) as SaleRecord[]);
  }, []);

  const resetForm = () => {
    setSaleForm({
      customerName: "",
      date: "",
      totalAmount: "",
      items: [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
    });
    setSaleInvoiceFile(null);
    setEditingSaleId(null);
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        await Promise.all([loadCustomers(), loadSales()]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load sales",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, [loadCustomers, loadSales]);

  const filteredSales = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return sales;
    }

    return sales.filter((sale) => {
      const haystack = [
        sale.customer?.name ?? `#${sale.customerId}`,
        sale.customer?.phone ?? "",
        sale.customer?.email ?? "",
        sale.items.map((item) => `${item.machineType} ${item.size}`).join(" "),
        sale.invoiceImage ?? "",
        sale.invoiceUrl ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, sales]);

  const totals = useMemo(() => {
    const customerSet = new Set(
      sales.map((sale) => sale.customer?.id ?? sale.customerId),
    );

    return {
      customers: customerSet.size,
      sales: sales.length,
      amount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    };
  }, [sales]);

  const exportDeliveryPdf = (sale: SaleRecord) => {
    const doc = new jsPDF();
    const customerName = sale.customer?.name ?? `#${sale.customerId}`;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Plasticon", 14, 8);

    doc.setTextColor(23, 37, 84);
    doc.setFontSize(16);
    doc.text(isArabic ? "إرسالية بيع" : "Sales Delivery Note", 14, 22);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text(`${isArabic ? "رقم العملية" : "Sale ID"}: #${sale.id}`, 14, 30);
    doc.text(`${isArabic ? "الزبون" : "Customer"}: ${customerName}`, 14, 36);
    doc.text(
      `${isArabic ? "التاريخ" : "Date"}: ${new Date(sale.date).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}`,
      14,
      42,
    );
    doc.text(
      `${isArabic ? "الإجمالي" : "Total"}: ${formatMoney(locale, sale.totalAmount)}`,
      14,
      48,
    );

    autoTable(doc, {
      startY: 56,
      head: [
        [
          isArabic ? "نوع الماكينة" : "Machine type",
          isArabic ? "المقاس" : "Size",
          isArabic ? "الكمية" : "Quantity",
          isArabic ? "سعر الوحدة" : "Unit price",
          isArabic ? "الإجمالي" : "Line total",
        ],
      ],
      body: sale.items.map((item) => [
        item.machineType,
        item.size,
        String(item.quantity),
        formatMoney(locale, item.pricePerUnit),
        formatMoney(locale, item.quantity * item.pricePerUnit),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`delivery-note-sale-${sale.id}.pdf`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageSales) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (!editingSaleId && !saleInvoiceFile) {
      setErrorMessage(isArabic ? "صورة الفاتورة مطلوبة لإضافة عملية بيع." : "Invoice image is required to create a sale.");
      return;
    }

    try {
      const body = new FormData();
      body.append("customerName", saleForm.customerName.trim());
      if (saleForm.date) body.append("date", saleForm.date);
      if (saleForm.totalAmount)
        body.append("totalAmount", saleForm.totalAmount);

      const items = saleForm.items
        .filter(
          (item) =>
            item.machineType && item.size && item.quantity && item.pricePerUnit,
        )
        .map((item) => ({
          machineType: item.machineType,
          size: item.size,
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
        }));

      body.append("items", JSON.stringify(items));

      if (saleInvoiceFile) {
        body.append("invoiceFile", saleInvoiceFile);
      }

      const response = await fetchWithAuth(
        editingSaleId ? `/sales/${editingSaleId}` : "/sales",
        {
          method: editingSaleId ? "PUT" : "POST",
          body,
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setSuccessMessage(
        editingSaleId
          ? isArabic
            ? "تم تعديل عملية البيع"
            : "Sale updated successfully"
          : isArabic
            ? "تمت إضافة عملية بيع جديدة"
            : "Sale created successfully",
      );

      await loadSales();
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save sale",
      );
    }
  };

  const deleteSale = async (id: number) => {
    if (!canManageSales) {
      return;
    }

    const confirmed = await confirmDialog(text.confirmDelete, { danger: true });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/sales/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      await loadSales();
      setSuccessMessage(isArabic ? "تم حذف عملية البيع" : "Sale deleted");
      if (editingSaleId === id) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete sale",
      );
    }
  };

  const startEditSale = (sale: SaleRecord) => {
    if (!canManageSales) {
      return;
    }

    setEditingSaleId(sale.id);
    setSaleForm({
      customerName: sale.customer?.name ?? "",
      date: toDateInput(sale.date),
      totalAmount:
        Number.isFinite(sale.totalAmount) && sale.totalAmount >= 0
          ? String(sale.totalAmount)
          : "",
      items:
        sale.items.length > 0
          ? sale.items.map((item) => ({
              machineType: item.machineType,
              size: item.size,
              quantity: String(item.quantity),
              pricePerUnit: String(item.pricePerUnit),
            }))
          : [{ machineType: "", size: "", quantity: "", pricePerUnit: "" }],
    });
    setSaleInvoiceFile(null);
  };

  const avatarColors = ["#2563eb","#7c3aed","#059669","#d97706","#dc2626","#0891b2","#db2777"];

  return (
    <ModulePageShell
      title={text.title}
      subtitle={text.subtitle}
      actions={
        <button
          type="button"
          onClick={() => void loadSales()}
          style={{ display:"flex", alignItems:"center", gap:".4rem", padding:".45rem 1rem", borderRadius:8, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-secondary)", fontSize:".83rem", fontWeight:600, cursor:"pointer" }}
        >
          <RefreshCw size={14} />{text.refresh}
        </button>
      }
    >
      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:"1rem", marginBottom:"1.75rem" }}>
        {[
          { icon:<Users size={18}/>, value:totals.customers, label:text.summaryCustomers, sub:isArabic?"مشترٍ فريد":"unique buyers", grad:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%)", shadow:"rgba(37,99,235,.4)" },
          { icon:<TrendingUp size={18}/>, value:totals.sales, label:text.summarySales, sub:isArabic?"عملية بيع":"total transactions", grad:"linear-gradient(135deg,#064e3b 0%,#059669 100%)", shadow:"rgba(5,150,105,.4)" },
          { icon:<DollarSign size={18}/>, value:formatMoney(locale,totals.amount), label:text.summaryAmount, sub:isArabic?"إجمالي الإيرادات":"gross revenue", grad:"linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)", shadow:"rgba(124,58,237,.4)" },
        ].map(card => (
          <div key={card.label} style={{ position:"relative", overflow:"hidden", background:card.grad, borderRadius:16, padding:"1.4rem 1.5rem", color:"#fff", boxShadow:`0 6px 20px ${card.shadow}` }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:90, height:90, borderRadius:"50%", background:"rgba(255,255,255,.08)" }}/>
            <div style={{ background:"rgba(255,255,255,.18)", borderRadius:10, padding:".45rem", display:"inline-flex", marginBottom:".75rem" }}>{card.icon}</div>
            <p style={{ margin:0, fontSize:"2.1rem", fontWeight:800, lineHeight:1 }}>{card.value}</p>
            <p style={{ margin:"5px 0 0", fontSize:".77rem", fontWeight:700, opacity:.85, textTransform:"uppercase", letterSpacing:".06em" }}>{card.label}</p>
            <p style={{ margin:"2px 0 0", fontSize:".71rem", opacity:.6 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"1.5rem" }}>
        <Search size={15} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--text-tertiary,#9ca3af)", pointerEvents:"none" }}/>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={text.searchPlaceholder}
          style={{ width:"100%", padding:".72rem 1rem .72rem 2.5rem", borderRadius:12, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-primary)", fontSize:".875rem", outline:"none", boxSizing:"border-box" }}
        />
      </div>

      {/* Form — accountant only */}
      {canManageSales ? (
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-default)", borderRadius:16, marginBottom:"1.5rem", overflow:"hidden" }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border-default)", background: editingSaleId?"linear-gradient(90deg,rgba(245,158,11,.08),transparent)":"linear-gradient(90deg,rgba(37,99,235,.06),transparent)", display:"flex", alignItems:"center", gap:".6rem" }}>
            <div style={{ width:30, height:30, borderRadius:8, background:editingSaleId?"rgba(245,158,11,.15)":"rgba(37,99,235,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {editingSaleId ? <Pencil size={14} style={{ color:"#f59e0b" }}/> : <Plus size={14} style={{ color:"#2563eb" }}/>}
            </div>
            <h3 style={{ margin:0, fontSize:".92rem", fontWeight:700, color:"var(--text-primary)" }}>{text.formTitle}</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding:"1.25rem", display:"grid", gap:".9rem" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".9rem" }}>
              <div>
                <label style={{ display:"block", fontSize:".78rem", fontWeight:600, color:"var(--text-secondary)", marginBottom:".3rem" }}>{text.customer}</label>
                <input list="customers-datalist" value={saleForm.customerName} onChange={e => setSaleForm(p=>({...p,customerName:e.target.value}))} placeholder={isArabic?"اكتب اسم الزبون...":"Type customer name..."} required
                  style={{ width:"100%", padding:".6rem .85rem", borderRadius:9, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-primary)", fontSize:".875rem", boxSizing:"border-box" }}/>
                <datalist id="customers-datalist">{customers.map(c=><option key={c.id} value={c.name}/>)}</datalist>
              </div>
              <div>
                <label style={{ display:"block", fontSize:".78rem", fontWeight:600, color:"var(--text-secondary)", marginBottom:".3rem" }}>{text.saleDate}</label>
                <input type="date" value={saleForm.date} onChange={e => setSaleForm(p=>({...p,date:e.target.value}))}
                  style={{ width:"100%", padding:".6rem .85rem", borderRadius:9, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-primary)", fontSize:".875rem", boxSizing:"border-box" }}/>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:".78rem", fontWeight:600, color:"var(--text-secondary)", marginBottom:".3rem" }}>{text.totalAmount}</label>
              <input type="number" min={0} step="0.01" value={saleForm.totalAmount} onChange={e => setSaleForm(p=>({...p,totalAmount:e.target.value}))}
                style={{ width:"100%", padding:".6rem .85rem", borderRadius:9, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-primary)", fontSize:".875rem", boxSizing:"border-box" }}/>
            </div>
            <div>
              <p style={{ margin:"0 0 .5rem", fontSize:".8rem", fontWeight:700, color:"var(--text-primary)" }}>{text.items}</p>
              <div style={{ display:"grid", gap:".6rem" }}>
                {saleForm.items.map((item,idx)=>(
                  <div key={`si-${idx}`} style={{ background:"var(--bg-subtle,rgba(0,0,0,.025))", borderRadius:10, padding:".75rem", border:"1px solid var(--border-default)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:".5rem" }}>
                      {[
                        { ph:text.machineType, val:item.machineType, key:"machineType" as const },
                        { ph:text.size, val:item.size, key:"size" as const },
                        { ph:text.quantity, val:item.quantity, key:"quantity" as const, type:"number", min:0.01 },
                        { ph:text.unitPrice, val:item.pricePerUnit, key:"pricePerUnit" as const, type:"number", min:0 },
                      ].map(f=>(
                        <input key={f.key} type={f.type ?? "text"} min={f.min} step="0.01" placeholder={f.ph} value={f.val}
                          onChange={e => setSaleForm(p=>({...p, items:p.items.map((c,i)=>i===idx?{...c,[f.key]:e.target.value}:c)}))} required
                          style={{ padding:".5rem .7rem", borderRadius:8, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-primary)", fontSize:".83rem", boxSizing:"border-box", width:"100%" }}/>
                      ))}
                    </div>
                    {saleForm.items.length>1 && (
                      <button type="button" onClick={()=>setSaleForm(p=>({...p,items:p.items.filter((_,i)=>i!==idx)}))}
                        style={{ marginTop:".5rem", padding:".28rem .7rem", borderRadius:6, border:"1px solid rgba(239,68,68,.3)", background:"rgba(239,68,68,.06)", color:"#ef4444", fontSize:".77rem", fontWeight:600, cursor:"pointer" }}>
                        {text.removeItem}
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={()=>setSaleForm(p=>({...p,items:[...p.items,{machineType:"",size:"",quantity:"",pricePerUnit:""}]}))}
                  style={{ padding:".5rem 1rem", borderRadius:9, border:"1px dashed var(--border-default)", background:"transparent", color:"var(--text-secondary)", fontSize:".83rem", fontWeight:600, cursor:"pointer" }}>
                  + {text.addItem}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:".78rem", fontWeight:600, color:"var(--text-secondary)", marginBottom:".3rem" }}>
                {text.invoice}
                {!editingSaleId && <span style={{ color:"#ef4444", marginLeft:".25rem" }}>*</span>}
              </label>
              <input type="file" accept="image/*,application/pdf" onChange={e=>setSaleInvoiceFile(e.target.files?.[0]??null)} style={{ fontSize:".84rem", color:"var(--text-primary)" }}/>
              {!editingSaleId && !saleInvoiceFile && <p style={{ margin:"4px 0 0", fontSize:".74rem", color:"#ef4444" }}>{isArabic ? "مطلوب للبيع الجديد" : "Required for new sales"}</p>}
              {saleInvoiceFile && <p style={{ margin:"4px 0 0", fontSize:".76rem", color:"var(--text-secondary)" }}>{text.fileSelected}: {saleInvoiceFile.name}</p>}
            </div>
            <div style={{ display:"flex", gap:".6rem", paddingTop:".1rem" }}>
              <button type="submit" style={{ padding:".62rem 1.4rem", borderRadius:9, border:"none", background:editingSaleId?"#f59e0b":"#2563eb", color:"#fff", fontSize:".875rem", fontWeight:700, cursor:"pointer" }}>
                {editingSaleId ? text.update : text.create}
              </button>
              {editingSaleId && (
                <button type="button" onClick={resetForm} style={{ padding:".62rem 1rem", borderRadius:9, border:"1px solid var(--border-default)", background:"transparent", color:"var(--text-secondary)", fontSize:".875rem", fontWeight:600, cursor:"pointer" }}>
                  {text.cancel}
                </button>
              )}
            </div>
          </form>
        </div>
      ) : null}

      {errorMessage && <div className="auth-alert auth-alert--error" style={{ marginBottom:"1rem" }}>{errorMessage}</div>}
      {successMessage && <div className="auth-alert auth-alert--success" style={{ marginBottom:"1rem" }}>{successMessage}</div>}

      {/* Sales Ledger Table */}
      <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-default)", borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border-default)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 style={{ margin:0, fontSize:".95rem", fontWeight:700, color:"var(--text-primary)" }}>{text.listTitle}</h3>
          <span style={{ background:"var(--bg-subtle,rgba(0,0,0,.06))", color:"var(--text-secondary)", fontSize:".75rem", fontWeight:700, borderRadius:999, padding:".2rem .7rem" }}>{filteredSales.length}</span>
        </div>
        {loading ? (
          <div style={{ padding:"2.5rem", textAlign:"center", color:"var(--text-secondary)", fontSize:".875rem" }}>{text.loading}</div>
        ) : filteredSales.length===0 ? (
          <div style={{ padding:"3rem", textAlign:"center", color:"var(--text-tertiary,#9ca3af)", fontSize:".875rem" }}>{text.noData}</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".855rem" }}>
              <thead>
                <tr style={{ background:"var(--bg-subtle,rgba(0,0,0,.03))" }}>
                  {[text.customer, text.saleDate, text.items, text.totalAmount, isArabic?"وثائق":"Docs", ...(canManageSales?[text.actions]:[])].map((h,i)=>(
                    <th key={i} style={{ padding:".7rem 1rem", textAlign:i===3?"right":"left", fontWeight:700, fontSize:".73rem", color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale,idx)=>{
                  const invoiceUrl = getRecordInvoiceUrl(sale);
                  const cname = sale.customer?.name ?? `#${sale.customerId}`;
                  const initials = cname.split(" ").slice(0,2).map((w:string)=>w[0]?.toUpperCase()??"").join("");
                  const bg = avatarColors[Math.abs(sale.customerId)%avatarColors.length];
                  return (
                    <tr key={sale.id} style={{ borderTop:idx===0?"none":"1px solid var(--border-default)" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-hover,rgba(0,0,0,.02))")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <td style={{ padding:".75rem 1rem" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:bg, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".7rem", fontWeight:800, flexShrink:0 }}>{initials}</div>
                          <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{cname}</span>
                        </div>
                      </td>
                      <td style={{ padding:".75rem 1rem", color:"var(--text-secondary)", whiteSpace:"nowrap" }}>
                        {new Date(sale.date).toLocaleDateString(locale==="ar"?"ar-EG":"en-US",{year:"numeric",month:"short",day:"numeric"})}
                      </td>
                      <td style={{ padding:".75rem 1rem", maxWidth:220 }}>
                        {sale.items.map(item=>(
                          <div key={item.id} style={{ fontSize:".78rem", lineHeight:1.6 }}>
                            <span style={{ fontWeight:600, color:"var(--text-primary)" }}>{item.machineType}</span>
                            {item.size&&<span style={{ color:"var(--text-secondary)" }}> {item.size}</span>}
                            <span style={{ color:"var(--text-tertiary,#9ca3af)" }}> · {item.quantity} × {formatMoney(locale,item.pricePerUnit)}</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding:".75rem 1rem", textAlign:"right", whiteSpace:"nowrap" }}>
                        <span style={{ fontWeight:800, fontSize:".95rem", color:"#059669" }}>{formatMoney(locale,sale.totalAmount)}</span>
                      </td>
                      <td style={{ padding:".75rem 1rem" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:".4rem" }}>
                          {invoiceUrl&&(
                            <a href={invoiceUrl} target="_blank" rel="noreferrer" title={text.invoiceLink}
                              style={{ display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:7, border:"1px solid var(--border-default)", background:"var(--bg-card)", color:"var(--text-secondary)", textDecoration:"none" }}>
                              <ExternalLink size={13}/>
                            </a>
                          )}
                          <button type="button" onClick={()=>exportDeliveryPdf(sale)} title={text.deliveryPdf}
                            style={{ display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:7, border:"1px solid rgba(37,99,235,.3)", background:"rgba(37,99,235,.07)", color:"#2563eb", cursor:"pointer" }}>
                            <FileText size={13}/>
                          </button>
                        </div>
                      </td>
                      {canManageSales&&(
                        <td style={{ padding:".75rem 1rem" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:".4rem" }}>
                            <button type="button" onClick={()=>startEditSale(sale)} title={text.edit}
                              style={{ display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:7, border:"1px solid rgba(245,158,11,.3)", background:"rgba(245,158,11,.08)", color:"#d97706", cursor:"pointer" }}>
                              <Pencil size={13}/>
                            </button>
                            <button type="button" onClick={()=>void deleteSale(sale.id)} title={text.delete}
                              style={{ display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:7, border:"1px solid rgba(239,68,68,.3)", background:"rgba(239,68,68,.07)", color:"#ef4444", cursor:"pointer" }}>
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModulePageShell>
  );
}

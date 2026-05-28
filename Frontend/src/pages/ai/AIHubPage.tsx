import { useNavigate } from "react-router-dom";
import {
  Bot, Sparkles, AlertTriangle, Wrench, ClipboardList, Users,
  ArrowRight, Zap, Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { AIKeyframes } from "./_shared";

type Tool = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  gradient: [string, string];
  titleEn: string; titleAr: string;
  descEn: string; descAr: string;
  path: string;
  roles: string[];
  badge?: string;
};

const TOOLS: Tool[] = [
  {
    icon: Bot,
    gradient: ["#6366f1", "#8b5cf6"],
    titleEn: "AI Factory Assistant", titleAr: "مساعد المصنع الذكي",
    descEn: "Role-aware chat assistant with factory knowledge base. Ask anything about production, maintenance, or factory operations.",
    descAr: "مساعد دردشة ذكي يعرف دورك ويعرف المصنع. اسأل عن الإنتاج، الصيانة، أو أي شيء آخر.",
    path: "/ai/assistant",
    roles: ["ADMIN", "ENGINEER", "ACCOUNTANT", "WORKER"],
    badge: "Chat + RAG",
  },
  {
    icon: Sparkles,
    gradient: ["#6366f1", "#ec4899"],
    titleEn: "AI Invoice Extraction", titleAr: "استخراج الفواتير بالذكاء الاصطناعي",
    descEn: "Upload any invoice image or PDF and extract all data automatically — supports Arabic, Hebrew, and English.",
    descAr: "ارفع صورة أو PDF للفاتورة واستخرج كل البيانات تلقائياً — يدعم العربية والعبرية والإنجليزية.",
    path: "/ai/invoice-extract",
    roles: ["ADMIN", "ACCOUNTANT"],
    badge: "Vision",
  },
  {
    icon: AlertTriangle,
    gradient: ["#dc2626", "#f97316"],
    titleEn: "Anomaly Detection", titleAr: "كشف شذوذ الإنتاج",
    descEn: "Automatically detect production anomalies — machines with low output, excessive downtime, or zero production.",
    descAr: "اكتشف تلقائياً الشذوذات في الإنتاج — آلات بإنتاج منخفض، توقف مفرط، أو إنتاج صفري.",
    path: "/ai/anomaly-detection",
    roles: ["ADMIN", "ENGINEER"],
  },
  {
    icon: Wrench,
    gradient: ["#0ea5e9", "#6366f1"],
    titleEn: "Maintenance Report", titleAr: "تقرير الصيانة",
    descEn: "Generate a professional, formal maintenance report from your field notes in seconds.",
    descAr: "ولّد تقريراً صيانة رسمياً واحترافياً من ملاحظاتك الميدانية في ثوانٍ.",
    path: "/ai/maintenance-report",
    roles: ["ENGINEER", "ADMIN"],
  },
  {
    icon: ClipboardList,
    gradient: ["#7c3aed", "#6366f1"],
    titleEn: "Shift Handover", titleAr: "تسليم الشفت",
    descEn: "Auto-generate a complete shift handover note with production stats, machine status, and action items.",
    descAr: "ولّد ملاحظة تسليم شفت شاملة تلقائياً مع إحصائيات الإنتاج، حالة الآلات، والمهام العاجلة.",
    path: "/ai/shift-handover",
    roles: ["ADMIN"],
  },
  {
    icon: Users,
    gradient: ["#10b981", "#0ea5e9"],
    titleEn: "Worker Coaching", titleAr: "تدريب أداء العامل",
    descEn: "Generate a constructive performance coaching report based on attendance and production data.",
    descAr: "ولّد تقرير تدريب بنّاء بناءً على بيانات الحضور والإنتاجية — لمساعدة العامل على التطور.",
    path: "/ai/worker-coaching",
    roles: ["ADMIN"],
  },
];

export function AIHubPage() {
  const { user }   = useAuth();
  const { locale } = useLocale();
  const navigate   = useNavigate();
  const isAr = locale === "ar";
  const role = (user?.role ?? "WORKER").toUpperCase();

  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ padding: "1.5rem", maxWidth: 1060, margin: "0 auto" }}>
      <AIKeyframes />

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "2.5rem 1rem 2rem", marginBottom: "2rem" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px #6366f140", marginBottom: "1.25rem" }}>
          <Zap size={30} color="#fff" />
        </div>
        <h1 style={{ margin: "0 0 .6rem", fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>
          {isAr ? "أدوات الذكاء الاصطناعي" : "AI Tools"}
        </h1>
        <p style={{ margin: "0 auto", maxWidth: 520, fontSize: ".92rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          {isAr
            ? "مجموعة أدوات الذكاء الاصطناعي المصممة لمصنع بلاستيكون — مدعومة بـ GPT-4o وقاعدة المعرفة."
            : "AI-powered tools built for Plasticon factory operations — powered by GPT-4o and a factory knowledge base."}
        </p>
      </div>

      {/* Tools grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {TOOLS.map((tool) => {
          const [from, to] = tool.gradient;
          const hasAccess  = tool.roles.includes(role);
          return (
            <div
              key={tool.path}
              onClick={() => hasAccess && navigate(tool.path)}
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-default)",
                borderRadius: 16, padding: "1.35rem", display: "flex", flexDirection: "column", gap: "1rem",
                cursor: hasAccess ? "pointer" : "default",
                transition: "all .18s",
                opacity: hasAccess ? 1 : .55,
                boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                ...(hasAccess ? { ":hover": { borderColor: from, transform: "translateY(-2px)" } } : {}),
              }}
              onMouseEnter={(e) => { if (hasAccess) { (e.currentTarget as HTMLDivElement).style.borderColor = from; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${from}22`; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-default)"; (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,.06)"; }}
            >
              {/* Icon + badges */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg, ${from}, ${to})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${from}40` }}>
                  <tool.icon size={21} color="#fff" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".3rem" }}>
                  {tool.badge && (
                    <span style={{ padding: ".18rem .55rem", borderRadius: 999, fontSize: ".65rem", fontWeight: 700, background: `${from}18`, color: from, letterSpacing: ".04em" }}>
                      {tool.badge}
                    </span>
                  )}
                  {!hasAccess && (
                    <span style={{ display: "flex", alignItems: "center", gap: ".25rem", padding: ".18rem .55rem", borderRadius: 999, fontSize: ".65rem", fontWeight: 700, background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                      <Lock size={9} /> {isAr ? "محدود" : "Restricted"}
                    </span>
                  )}
                </div>
              </div>

              {/* Text */}
              <div>
                <p style={{ margin: "0 0 .4rem", fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {isAr ? tool.titleAr : tool.titleEn}
                </p>
                <p style={{ margin: 0, fontSize: ".82rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {isAr ? tool.descAr : tool.descEn}
                </p>
              </div>

              {/* Roles row + CTA */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                  {tool.roles.map((r) => (
                    <span key={r} style={{ padding: ".15rem .45rem", borderRadius: 999, fontSize: ".65rem", fontWeight: 700, background: "var(--bg-subtle)", color: "var(--text-muted)" }}>{r}</span>
                  ))}
                </div>
                {hasAccess && (
                  <span style={{ display: "flex", alignItems: "center", gap: ".25rem", fontSize: ".8rem", fontWeight: 600, color: from }}>
                    {isAr ? "فتح" : "Open"} <ArrowRight size={13} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p style={{ textAlign: "center", marginTop: "2rem", fontSize: ".78rem", color: "var(--text-muted)" }}>
        {isAr ? "جميع الأدوات مدعومة بـ GPT-4o من OpenAI وتعمل على بيانات مصنعك الحية." : "All tools are powered by GPT-4o from OpenAI and work on your live factory data."}
      </p>
    </div>
  );
}

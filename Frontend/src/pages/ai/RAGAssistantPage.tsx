import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ChangeEvent } from "react";
import { Bot, Send, Upload, BarChart2, RefreshCw, X, FileText, ChevronDown, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { RenderText as SharedRenderText } from "./_shared";

const RAG_URL = "http://localhost:3001";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "chat" | "material" | "summary";
type Msg = { id: string; from: "user" | "ai"; text: string; ts: string };

type MaterialResult = {
  materialName: string | null;
  supplier: string | null;
  specifications: Record<string, string | null | Record<string, string>>;
  safetyNotes: string[];
  storageRequirements: string | null;
  compatibilityWarnings: string[];
  recommendedUsage: string | null;
  certifications: string[];
  shelfLife: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function roleBadgeColor(role: string) {
  switch (role.toLowerCase()) {
    case "admin":    return "#6366f1";
    case "engineer": return "#0ea5e9";
    case "worker":   return "#10b981";
    default:         return "#f59e0b";
  }
}

// Render simple markdown: bold (**text**), bullet lists, line breaks
function RenderText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight: 1.65, fontSize: ".9rem" }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        // Heading: ##
        if (/^#{1,3}\s/.test(line)) {
          const content = line.replace(/^#+\s/, "");
          return (
            <p key={i} style={{ fontWeight: 700, margin: ".6rem 0 .2rem", color: "var(--text-primary)" }}>
              {content}
            </p>
          );
        }
        // Bullet list
        if (/^[-•*]\s/.test(line)) {
          const content = line.replace(/^[-•*]\s/, "");
          return (
            <div key={i} style={{ display: "flex", gap: ".4rem", margin: ".15rem 0" }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>•</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }
        // Numbered
        if (/^\d+\.\s/.test(line)) {
          const num   = line.match(/^\d+/)![0];
          const content = line.replace(/^\d+\.\s/, "");
          return (
            <div key={i} style={{ display: "flex", gap: ".4rem", margin: ".15rem 0" }}>
              <span style={{ color: "var(--text-muted)", flexShrink: 0, minWidth: "1.2rem" }}>{num}.</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }
        return <p key={i} style={{ margin: ".2rem 0" }}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function RAGAssistantPage() {
  const { user }  = useAuth();
  const { locale } = useLocale();
  const isAr       = locale === "ar";
  const role       = (user?.role ?? "WORKER").toLowerCase();
  const userId     = user?.id ?? null;
  const canSummary = ["admin", "supervisor", "engineer"].includes(role);

  // Stable session per page load
  const sessionId = useRef(uid());

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("chat");

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [messages, setMessages]   = useState<Msg[]>([
    {
      id: uid(),
      from: "ai",
      text: isAr
        ? `مرحباً ${user?.name ?? ""}! أنا مساعد مصنع بلاستيكون الذكي. كيف يمكنني مساعدتك اليوم؟`
        : `Hello ${user?.name ?? ""}! I'm the Plasticon factory AI assistant. How can I help you today?`,
      ts: new Date().toISOString(),
    },
  ]);
  const [input, setInput]         = useState("");
  const [thinking, setThinking]   = useState(false);
  const messagesEndRef             = useRef<HTMLDivElement>(null);
  const textareaRef                = useRef<HTMLTextAreaElement>(null);

  // ── Material analysis state ────────────────────────────────────────────────
  const [matFile, setMatFile]         = useState<File | null>(null);
  const [matLoading, setMatLoading]   = useState(false);
  const [matResult, setMatResult]     = useState<MaterialResult | null>(null);
  const [matError, setMatError]       = useState("");

  // ── Production summary state ───────────────────────────────────────────────
  const [sumDate, setSumDate]     = useState(new Date().toISOString().split("T")[0]);
  const [sumShift, setSumShift]   = useState("");
  const [sumLoading, setSumLoading] = useState(false);
  const [sumResult, setSumResult] = useState<{ summary: string; rawData: unknown; fromCache: boolean } | null>(null);
  const [sumError, setSumError]   = useState("");

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 130)}px`;
  }, [input]);

  // ── Chat send ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg: Msg = { id: uid(), from: "user", text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch(`${RAG_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId.current, userId, role }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const data = await res.json() as { answer: string };
      setMessages((prev) => [...prev, { id: uid(), from: "ai", text: data.answer, ts: new Date().toISOString() }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, {
        id: uid(), from: "ai",
        text: isAr ? `عذراً، حدث خطأ: ${msg}` : `Sorry, an error occurred: ${msg}`,
        ts: new Date().toISOString(),
      }]);
    } finally {
      setThinking(false);
      textareaRef.current?.focus();
    }
  }, [input, thinking, userId, role, isAr]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(e as unknown as FormEvent);
    }
  };

  // ── Material analysis ──────────────────────────────────────────────────────
  const analyzeMaterial = useCallback(async () => {
    if (!matFile) return;
    setMatLoading(true);
    setMatError("");
    setMatResult(null);

    const form = new FormData();
    form.append("file", matFile);

    try {
      const res = await fetch(`${RAG_URL}/api/analyze-material`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { data: MaterialResult };
      setMatResult(data.data);
    } catch (err) {
      setMatError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setMatLoading(false);
    }
  }, [matFile]);

  // ── Production summary ─────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSumLoading(true);
    setSumError("");
    setSumResult(null);

    try {
      const res = await fetch(`${RAG_URL}/api/production-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: sumDate, shift: sumShift || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { summary: string; rawData: unknown; fromCache: boolean };
      setSumResult(data);
    } catch (err) {
      setSumError(err instanceof Error ? err.message : "Failed to fetch summary");
    } finally {
      setSumLoading(false);
    }
  }, [sumDate, sumShift]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div dir={isAr ? "rtl" : "ltr"} style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", background: "var(--bg-default)" }}>

      {/* ── Page header ── */}
      <div style={{ padding: "1rem 1.5rem .75rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {isAr ? "مساعد المصنع الذكي" : "AI Factory Assistant"}
            </h1>
            <p style={{ margin: 0, fontSize: ".75rem", color: "var(--text-muted)" }}>
              {isAr ? "مدعوم بـ GPT-4o + قاعدة المعرفة" : "Powered by GPT-4o + Knowledge Base"}
            </p>
          </div>
        </div>
        <span style={{
          marginLeft: isAr ? 0 : "auto", marginRight: isAr ? "auto" : 0,
          padding: ".2rem .7rem", borderRadius: 999,
          background: roleBadgeColor(role) + "22", color: roleBadgeColor(role),
          fontSize: ".73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em",
        }}>
          {role}
        </span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-default)", background: "var(--bg-surface)", flexShrink: 0 }}>
        {(["chat", ...(["engineer","admin","supervisor"].includes(role) ? ["material"] : []), ...(canSummary ? ["summary"] : [])] as Tab[]).map((t) => {
          const labels: Record<Tab, [string, string]> = {
            chat:     [isAr ? "المحادثة" : "Chat",            ""],
            material: [isAr ? "تحليل المواد" : "Analyze Material", ""],
            summary:  [isAr ? "ملخص الإنتاج" : "Production Summary", ""],
          };
          const icons: Record<Tab, React.ReactNode> = {
            chat:     <Bot size={15} />,
            material: <FileText size={15} />,
            summary:  <BarChart2 size={15} />,
          };
          return (
            <button key={t} type="button"
              onClick={() => setTab(t)}
              style={{
                display: "flex", alignItems: "center", gap: ".4rem",
                padding: ".6rem 1.25rem", border: "none", cursor: "pointer",
                background: "transparent", fontSize: ".85rem", fontWeight: 600,
                color: tab === t ? "var(--clr-primary, #6366f1)" : "var(--text-secondary)",
                borderBottom: tab === t ? "2px solid var(--clr-primary, #6366f1)" : "2px solid transparent",
                transition: "all .15s",
              }}>
              {icons[t]} {labels[t][0]}
            </button>
          );
        })}
      </div>

      {/* ── Tab: CHAT ── */}
      {tab === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Quick prompts — shown only on fresh chat */}
          {messages.length === 1 && !thinking && (
            <QuickPrompts role={role} isAr={isAr} onSelect={(p) => { setInput(p); textareaRef.current?.focus(); }} />
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {messages.map((msg) => {
              const isAI = msg.from === "ai";
              return (
                <div key={msg.id} style={{ display: "flex", gap: ".6rem", flexDirection: isAI ? "row" : "row-reverse" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: isAI ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : roleBadgeColor(role) + "33",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isAI
                      ? <Bot size={16} color="#fff" />
                      : <span style={{ fontSize: ".72rem", fontWeight: 700, color: roleBadgeColor(role) }}>
                          {(user?.name ?? "U")[0].toUpperCase()}
                        </span>
                    }
                  </div>
                  {/* Bubble */}
                  <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: ".2rem", alignItems: isAI ? "flex-start" : "flex-end" }}>
                    <div style={{
                      padding: ".7rem 1rem",
                      borderRadius: isAI ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                      background: isAI ? "var(--bg-surface)" : "var(--clr-primary, #6366f1)",
                      color: isAI ? "var(--text-primary)" : "#fff",
                      border: isAI ? "1px solid var(--border-default)" : "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,.06)",
                    }}>
                      {isAI ? <SharedRenderText text={msg.text} /> : <p style={{ margin: 0, fontSize: ".9rem", lineHeight: 1.55 }}>{msg.text}</p>}
                    </div>
                    <span style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>{fmtTime(msg.ts)}</span>
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {thinking && (
              <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={16} color="#fff" />
                </div>
                <div style={{ padding: ".65rem 1rem", background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "4px 16px 16px 16px", display: "flex", gap: ".3rem", alignItems: "center" }}>
                  {[0,1,2].map((i) => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: "50%", background: "#6366f1",
                      animation: "rag-pulse 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form onSubmit={(e) => void sendMessage(e)} style={{ padding: ".6rem 1.25rem .9rem", borderTop: "1px solid var(--border-default)", background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: ".5rem" }}>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={thinking}
              placeholder={isAr ? "اكتب سؤالك… (Enter للإرسال)" : "Ask anything… (Enter to send)"}
              style={{
                flex: 1, resize: "none", border: "1px solid var(--border-default)", borderRadius: 12,
                padding: ".65rem 1rem", fontSize: ".9rem", background: "var(--bg-default)",
                color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
                lineHeight: 1.5, maxHeight: 130, overflowY: "auto",
                transition: "border-color .15s",
              }}
            />
              <button type="submit" disabled={!input.trim() || thinking}
                style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer", background: (!input.trim() || thinking) ? "var(--bg-subtle)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: (!input.trim() || thinking) ? "var(--text-muted)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0, boxShadow: (!input.trim() || thinking) ? "none" : "0 2px 8px #6366f140" }}>
                <Send size={17} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>
                {isAr ? "Enter للإرسال · Shift+Enter لسطر جديد" : "Enter to send · Shift+Enter for new line"}
              </span>
              {messages.length > 1 && (
                <button type="button" onClick={() => setMessages([messages[0]])} style={{ display: "flex", alignItems: "center", gap: ".3rem", fontSize: ".72rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: ".2rem .4rem", borderRadius: 5 }}>
                  <Trash2 size={11} /> {isAr ? "مسح المحادثة" : "Clear chat"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Tab: MATERIAL ANALYSIS ── */}
      {tab === "material" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ maxWidth: 680 }}>
            <h2 style={{ margin: "0 0 .4rem", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {isAr ? "تحليل بيانات المواد الخام" : "Raw Material Datasheet Analysis"}
            </h2>
            <p style={{ margin: "0 0 1rem", fontSize: ".85rem", color: "var(--text-muted)" }}>
              {isAr
                ? "ارفع ملف PDF لبيانات المادة وسيستخرج النظام المعلومات التقنية تلقائياً ويحفظها في قاعدة المعرفة."
                : "Upload a material datasheet PDF and the system will extract technical specs automatically and index them in the knowledge base."}
            </p>

            {/* Upload zone */}
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: ".6rem", padding: "2rem", border: "2px dashed var(--border-default)",
              borderRadius: 12, cursor: "pointer", background: matFile ? "var(--bg-subtle)" : "var(--bg-surface)",
              transition: "all .15s",
            }}>
              <input type="file" accept=".pdf" style={{ display: "none" }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setMatFile(e.target.files?.[0] ?? null);
                  setMatResult(null);
                  setMatError("");
                }} />
              <Upload size={28} color={matFile ? "#6366f1" : "var(--text-muted)"} />
              <span style={{ fontSize: ".9rem", color: matFile ? "var(--text-primary)" : "var(--text-muted)", fontWeight: matFile ? 600 : 400 }}>
                {matFile ? matFile.name : (isAr ? "انقر لاختيار ملف PDF" : "Click to choose a PDF file")}
              </span>
              {matFile && (
                <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                  {(matFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </label>

            {matFile && (
              <div style={{ display: "flex", gap: ".6rem", marginTop: ".75rem" }}>
                <button type="button" onClick={() => void analyzeMaterial()} disabled={matLoading}
                  style={{ flex: 1, padding: ".65rem", border: "none", borderRadius: 8, cursor: matLoading ? "default" : "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: ".88rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
                  {matLoading
                    ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> {isAr ? "جارٍ التحليل…" : "Analyzing…"}</>
                    : <><FileText size={15} /> {isAr ? "تحليل المادة" : "Analyze Material"}</>}
                </button>
                <button type="button" onClick={() => { setMatFile(null); setMatResult(null); setMatError(""); }}
                  style={{ padding: ".65rem .9rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "transparent", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <X size={15} />
                </button>
              </div>
            )}

            {matError && (
              <div style={{ marginTop: ".75rem", padding: ".75rem 1rem", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: ".85rem" }}>
                {matError}
              </div>
            )}

            {/* Results */}
            {matResult && (
              <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {matResult.materialName ?? (isAr ? "مادة غير محددة" : "Unknown Material")}
                </h3>

                {[
                  { label: isAr ? "المورد" : "Supplier", value: matResult.supplier },
                  { label: isAr ? "الاستخدام الموصى به" : "Recommended Usage", value: matResult.recommendedUsage },
                  { label: isAr ? "متطلبات التخزين" : "Storage Requirements", value: matResult.storageRequirements },
                  { label: isAr ? "مدة الصلاحية" : "Shelf Life", value: matResult.shelfLife },
                ].map(({ label, value }) => value && (
                  <InfoRow key={label} label={label} value={value} />
                ))}

                {matResult.safetyNotes.length > 0 && (
                  <InfoList
                    label={isAr ? "ملاحظات السلامة" : "Safety Notes"}
                    items={matResult.safetyNotes}
                    color="#dc2626"
                  />
                )}
                {matResult.compatibilityWarnings.length > 0 && (
                  <InfoList
                    label={isAr ? "تحذيرات التوافق" : "Compatibility Warnings"}
                    items={matResult.compatibilityWarnings}
                    color="#d97706"
                  />
                )}
                {matResult.certifications.length > 0 && (
                  <InfoList
                    label={isAr ? "الشهادات" : "Certifications"}
                    items={matResult.certifications}
                    color="#059669"
                  />
                )}

                <div style={{ padding: ".75rem", background: "#dcfce7", borderRadius: 8, fontSize: ".8rem", color: "#166534" }}>
                  {isAr
                    ? "✓ تم حفظ بيانات هذه المادة في قاعدة المعرفة — يمكن الآن طرح أسئلة عنها في المحادثة."
                    : "✓ This material's data has been indexed — you can now ask questions about it in the Chat tab."}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: PRODUCTION SUMMARY ── */}
      {tab === "summary" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ maxWidth: 720 }}>
            <h2 style={{ margin: "0 0 .4rem", fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {isAr ? "ملخص الإنتاج" : "Production Summary"}
            </h2>
            <p style={{ margin: "0 0 1rem", fontSize: ".85rem", color: "var(--text-muted)" }}>
              {isAr
                ? "احصل على تقرير ذكاء اصطناعي شامل لأي يوم أو شفت."
                : "Get an AI-generated report for any date and shift."}
            </p>

            {/* Controls */}
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {isAr ? "التاريخ" : "Date"}
                </label>
                <input type="date" value={sumDate} onChange={(e) => setSumDate(e.target.value)}
                  style={{ padding: ".55rem .8rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: ".88rem" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                <label style={{ fontSize: ".78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  {isAr ? "الشفت (اختياري)" : "Shift (optional)"}
                </label>
                <div style={{ position: "relative" }}>
                  <select value={sumShift} onChange={(e) => setSumShift(e.target.value)}
                    style={{ padding: ".55rem 2rem .55rem .8rem", border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: ".88rem", appearance: "none", cursor: "pointer" }}>
                    <option value="">{isAr ? "كل الشفتات" : "All shifts"}</option>
                    <option value="morning">{isAr ? "صباحي" : "Morning"}</option>
                    <option value="evening">{isAr ? "مسائي" : "Evening"}</option>
                    <option value="night">{isAr ? "ليلي" : "Night"}</option>
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }} />
                </div>
              </div>

              <button type="button" onClick={() => void fetchSummary()} disabled={sumLoading}
                style={{ alignSelf: "flex-end", padding: ".57rem 1.2rem", border: "none", borderRadius: 8, cursor: sumLoading ? "default" : "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: ".88rem", display: "flex", alignItems: "center", gap: ".4rem" }}>
                {sumLoading
                  ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> {isAr ? "جارٍ…" : "Loading…"}</>
                  : <><BarChart2 size={14} /> {isAr ? "توليد التقرير" : "Generate Report"}</>}
              </button>
            </div>

            {sumError && (
              <div style={{ padding: ".75rem 1rem", background: "#fee2e2", borderRadius: 8, color: "#dc2626", fontSize: ".85rem", marginBottom: ".75rem" }}>
                {sumError}
              </div>
            )}

            {sumResult && (
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "1.25rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
                {sumResult.fromCache && (
                  <span style={{ fontSize: ".72rem", color: "var(--text-muted)", alignSelf: "flex-end" }}>
                    {isAr ? "من الذاكرة المؤقتة" : "From cache"}
                  </span>
                )}
                <RenderText text={sumResult.summary} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes rag-pulse {
          0%,100% { opacity:.25; transform:scale(.85); }
          50%      { opacity:1;    transform:scale(1.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: ".5rem", fontSize: ".85rem" }}>
      <span style={{ fontWeight: 600, color: "var(--text-secondary)", minWidth: 160 }}>{label}:</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function InfoList({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <p style={{ margin: "0 0 .3rem", fontSize: ".82rem", fontWeight: 700, color }}>{label}</p>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: ".4rem", fontSize: ".83rem", color: "var(--text-primary)", margin: ".15rem 0" }}>
          <span style={{ color, flexShrink: 0 }}>▸</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

// ── Quick prompt chips ─────────────────────────────────────────────────────────
const QUICK_PROMPTS: Record<string, { en: string; ar: string }[]> = {
  worker: [
    { en: "What are today's production targets?", ar: "ما هي أهداف الإنتاج لليوم؟" },
    { en: "How do I report a machine stop?", ar: "كيف أبلّغ عن توقف ماكينة؟" },
    { en: "What's the safety checklist for my shift?", ar: "ما هي قائمة السلامة للشفت؟" },
    { en: "Explain the quality check process.", ar: "اشرح لي عملية فحص الجودة." },
  ],
  engineer: [
    { en: "Summarize recent maintenance issues.", ar: "لخّص لي مشاكل الصيانة الأخيرة." },
    { en: "What are the top machines with downtime this week?", ar: "ما هي الماكينات الأكثر توقفاً هذا الأسبوع؟" },
    { en: "What spare parts should I check?", ar: "ما هي قطع الغيار التي يجب التحقق منها؟" },
    { en: "Explain the preventive maintenance schedule.", ar: "اشرح جدول الصيانة الوقائية." },
  ],
  admin: [
    { en: "Give me a summary of today's production.", ar: "أعطني ملخص الإنتاج اليوم." },
    { en: "Which machines are not operational?", ar: "ما هي الماكينات غير التشغيلية حالياً؟" },
    { en: "Summarize attendance for this week.", ar: "لخّص لي الحضور هذا الأسبوع." },
    { en: "What are the top issues to address?", ar: "ما هي أهم المشكلات التي يجب معالجتها؟" },
  ],
  accountant: [
    { en: "What are the key financial metrics I should track?", ar: "ما هي المقاييس المالية الأساسية التي يجب متابعتها؟" },
    { en: "Explain the invoice approval workflow.", ar: "اشرح لي دورة عمل الموافقة على الفواتير." },
    { en: "How is production cost calculated?", ar: "كيف يتم احتساب تكلفة الإنتاج؟" },
    { en: "Summarize supplier payment terms.", ar: "لخّص شروط دفع الموردين." },
  ],
};

function QuickPrompts({ role, isAr, onSelect }: { role: string; isAr: boolean; onSelect: (p: string) => void }) {
  const prompts = QUICK_PROMPTS[role] ?? QUICK_PROMPTS.worker;
  return (
    <div style={{ padding: ".75rem 1.5rem", borderBottom: "1px solid var(--border-default)", background: "var(--bg-subtle)", flexShrink: 0 }}>
      <p style={{ margin: "0 0 .5rem", fontSize: ".72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {isAr ? "اقتراحات سريعة" : "Quick prompts"}
      </p>
      <div style={{ display: "flex", gap: ".45rem", flexWrap: "wrap" }}>
        {prompts.map((p, i) => (
          <button
            key={i} type="button"
            onClick={() => onSelect(isAr ? p.ar : p.en)}
            style={{ padding: ".38rem .85rem", border: "1px solid var(--border-default)", borderRadius: 999, background: "var(--bg-surface)", color: "var(--text-secondary)", fontSize: ".8rem", cursor: "pointer", whiteSpace: "nowrap", transition: "all .14s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1"; (e.currentTarget as HTMLButtonElement).style.color = "#6366f1"; (e.currentTarget as HTMLButtonElement).style.background = "#6366f108"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)"; }}
          >
            {isAr ? p.ar : p.en}
          </button>
        ))}
      </div>
    </div>
  );
}

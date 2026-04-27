type ToastType = "success" | "error" | "warning" | "info";

const CFG: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "#16a34a", icon: "✓" },
  error:   { bg: "#dc2626", icon: "✕" },
  warning: { bg: "#d97706", icon: "⚠" },
  info:    { bg: "#3b82f6", icon: "ℹ" },
};

function getContainer(): HTMLElement {
  let el = document.getElementById("__toast_root__");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast_root__";
    Object.assign(el.style, {
      position: "fixed", top: "1rem", right: "1rem", zIndex: "999999",
      display: "flex", flexDirection: "column", gap: ".5rem",
      pointerEvents: "none", maxWidth: "400px", width: "calc(100% - 2rem)",
    });
    document.body.appendChild(el);
  }
  return el;
}

function show(message: string, type: ToastType = "info", duration = 4500) {
  const cfg = CFG[type];
  const container = getContainer();

  const el = document.createElement("div");
  Object.assign(el.style, {
    display: "flex", alignItems: "flex-start", gap: ".625rem",
    background: "var(--bg-card, #fff)",
    border: "1px solid var(--border-default, #e2e8f0)",
    borderLeft: `4px solid ${cfg.bg}`,
    borderRadius: "12px",
    padding: ".75rem 1rem",
    boxShadow: "0 8px 32px rgba(0,0,0,.15)",
    pointerEvents: "all",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: ".875rem",
    color: "var(--text-primary, #1e293b)",
    lineHeight: "1.45",
    wordBreak: "break-word",
    animation: "toastSlideIn .3s cubic-bezier(.34,1.56,.64,1)",
  });

  const icon = document.createElement("span");
  Object.assign(icon.style, {
    flexShrink: "0", width: "22px", height: "22px", borderRadius: "50%",
    background: cfg.bg, color: "#fff",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: ".75rem", fontWeight: "700", marginTop: "1px",
  });
  icon.textContent = cfg.icon;

  const text = document.createElement("span");
  text.style.flex = "1";
  text.textContent = message;

  const x = document.createElement("button");
  Object.assign(x.style, {
    flexShrink: "0", background: "none", border: "none",
    color: "var(--text-muted, #94a3b8)", cursor: "pointer",
    padding: "0", fontSize: "1.1rem", lineHeight: "1",
  });
  x.textContent = "×";

  el.appendChild(icon);
  el.appendChild(text);
  el.appendChild(x);
  container.appendChild(el);

  const dismiss = () => {
    el.style.transition = "opacity .2s, transform .2s";
    el.style.opacity = "0";
    el.style.transform = "translateX(calc(100% + 1rem))";
    setTimeout(() => el.remove(), 230);
  };

  const timer = setTimeout(dismiss, duration);
  const clear = () => clearTimeout(timer);
  x.addEventListener("click", (e) => { e.stopPropagation(); clear(); dismiss(); });
  el.addEventListener("click", () => { clear(); dismiss(); });
}

export const toast = {
  success: (msg: string, ms?: number) => show(msg, "success", ms),
  error:   (msg: string, ms?: number) => show(msg, "error",   ms),
  warning: (msg: string, ms?: number) => show(msg, "warning", ms),
  info:    (msg: string, ms?: number) => show(msg, "info",    ms),
};

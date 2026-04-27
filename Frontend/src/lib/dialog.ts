interface DialogOptions {
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
  title?: string;
}

export function confirmDialog(message: string, options: DialogOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0",
      background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: "999998", padding: "1rem",
      animation: "toastSlideIn .2s ease",
    });

    const card = document.createElement("div");
    Object.assign(card.style, {
      background: "var(--bg-card, #fff)",
      borderRadius: "16px", padding: "1.75rem",
      maxWidth: "380px", width: "100%",
      boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      display: "flex", flexDirection: "column", gap: "1rem",
      fontFamily: "inherit",
    });

    // Icon
    const iconWrap = document.createElement("div");
    Object.assign(iconWrap.style, {
      width: "48px", height: "48px", borderRadius: "50%",
      background: options.danger ? "rgba(239,68,68,.1)" : "rgba(249,115,22,.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.4rem",
    });
    iconWrap.textContent = options.danger ? "🗑️" : "⚠️";

    // Title (optional)
    if (options.title) {
      const title = document.createElement("strong");
      Object.assign(title.style, {
        fontSize: "1rem", color: "var(--text-primary, #1e293b)",
      });
      title.textContent = options.title;
      card.appendChild(iconWrap);
      card.appendChild(title);
    } else {
      card.appendChild(iconWrap);
    }

    // Message
    const msg = document.createElement("p");
    Object.assign(msg.style, {
      margin: "0", color: "var(--text-secondary, #475569)",
      fontSize: ".9rem", lineHeight: "1.5",
    });
    msg.textContent = message;

    // Buttons
    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, {
      display: "flex", gap: ".75rem", justifyContent: "flex-end", marginTop: ".25rem",
    });

    const cancelBtn = document.createElement("button");
    Object.assign(cancelBtn.style, {
      padding: ".5rem 1.25rem", borderRadius: "8px",
      border: "1px solid var(--border-default, #e2e8f0)",
      background: "transparent", color: "var(--text-primary, #1e293b)",
      cursor: "pointer", fontWeight: "600", fontSize: ".875rem", fontFamily: "inherit",
    });
    cancelBtn.textContent = options.cancelText || "Cancel";

    const confirmBtn = document.createElement("button");
    const confirmBg = options.danger ? "#dc2626" : "#f97316";
    Object.assign(confirmBtn.style, {
      padding: ".5rem 1.25rem", borderRadius: "8px", border: "none",
      background: confirmBg, color: "#fff",
      cursor: "pointer", fontWeight: "700", fontSize: ".875rem", fontFamily: "inherit",
    });
    confirmBtn.textContent = options.confirmText || "Confirm";

    const cleanup = (result: boolean) => { overlay.remove(); resolve(result); };
    cancelBtn.addEventListener("click", () => cleanup(false));
    confirmBtn.addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(false); });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    card.appendChild(msg);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  });
}

import { useEffect, useRef } from "react";
import { Toaster, toast } from "react-hot-toast";

const TOAST_DEDUPE_MS = 2500;

type AlertFn = (message?: string) => void;

declare global {
  interface Window {
    __originalAlert__?: AlertFn;
  }
}

export function AlertToaster() {
  const lastToastAtRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const now = () => Date.now();

    const emitToast = (message: string, isError: boolean) => {
      const key = `${isError ? "error" : "success"}:${message}`;
      const lastAt = lastToastAtRef.current.get(key) ?? 0;
      if (now() - lastAt < TOAST_DEDUPE_MS) {
        return;
      }

      lastToastAtRef.current.set(key, now());
      if (isError) {
        toast.error(message);
      } else {
        toast.success(message);
      }
    };

    if (!window.__originalAlert__) {
      window.__originalAlert__ = window.alert;
      window.alert = (message?: string) => {
        const text = String(message ?? "").trim();
        if (!text) {
          return;
        }
        emitToast(text, false);
      };
    }

    const markAndToast = (element: Element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      if (element.dataset.toastHandled === "true") {
        return;
      }

      const text = element.textContent?.trim();
      if (!text) {
        return;
      }

      const isError = element.classList.contains("auth-alert--error");
      emitToast(text, isError);

      element.dataset.toastHandled = "true";
      element.style.display = "none";
    };

    const scan = () => {
      document
        .querySelectorAll(".auth-alert")
        .forEach((element) => markAndToast(element));
    };

    scan();

    const observer = new MutationObserver(() => scan());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3600,
        style: {
          background: "#FFFFFF",
          color: "#000000",
          border: "1px solid #EEEEEE",
          borderRadius: "14px",
          boxShadow: "0 10px 24px rgba(47, 62, 52, 0.12)",
        },
      }}
    />
  );
}


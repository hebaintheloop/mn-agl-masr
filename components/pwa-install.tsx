"use client";
import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import "./pwa-install.css";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstall() {
  const prompt = useRef<InstallPrompt | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const display = matchMedia("(display-mode: standalone)");
    const standalone = () =>
      display.matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone;
    const sync = () => {
      setVisible(!standalone());
      if (standalone()) dialog.current?.close();
    };
    sync();
    const available = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
    };
    const installed = () => {
      prompt.current = null;
      setVisible(false);
      dialog.current?.close();
    };
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", sync);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", sync);
    };
  }, []);
  async function install() {
    if (busy) return;
    const deferred = prompt.current;
    if (!deferred) {
      dialog.current?.showModal();
      return;
    }
    setBusy(true);
    prompt.current = null;
    try {
      await deferred.prompt();
      const result = await deferred.userChoice;
      if (result.outcome === "accepted") setVisible(false);
    } catch {
      dialog.current?.showModal();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {visible && (
        <button
          className="pwa-install-button"
          onClick={install}
          disabled={busy}
        >
          <Download size={15} />
          {busy ? "بنفتح التثبيت…" : "تثبيت التطبيق"}
        </button>
      )}
      <dialog
        className="pwa-install-dialog"
        ref={dialog}
        aria-labelledby="pwa-install-heading"
      >
        <button
          className="pwa-install-close"
          onClick={() => dialog.current?.close()}
          aria-label="إغلاق تعليمات التثبيت"
        >
          <X size={20} />
        </button>
        <h2 id="pwa-install-heading">تثبيت التطبيق على موبايلك</h2>
        <h3>على Android</h3>
        <p>
          افتح الموقع في Chrome، ومن قائمة المتصفح اختار «تثبيت التطبيق» أو
          «إضافة إلى الشاشة الرئيسية».
        </p>
        <h3>على iPhone</h3>
        <p>
          افتح الموقع في Safari، واضغط على زر المشاركة، وبعدها «إضافة إلى الشاشة
          الرئيسية»، ثم «إضافة».
        </p>
        <p className="pwa-install-note">
          لو فاتح الموقع من جوّه Facebook أو Instagram، افتحه في متصفح الموبايل
          الأول. التطبيق محتاج إنترنت لتسجيل المشاركة والحضور.
        </p>
        <button className="primary" onClick={() => dialog.current?.close()}>
          تمام
        </button>
      </dialog>
    </>
  );
}

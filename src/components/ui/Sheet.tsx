"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

const SheetCtx = createContext<{ close: () => void } | null>(null);
export const useSheet = () => useContext(SheetCtx);

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <SheetCtx.Provider value={{ close: onClose }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
        <button aria-label="Close" className="animate-fade absolute inset-0 bg-navy/40" onClick={onClose} />
        <div className="animate-rise relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-3xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="rounded-full bg-canvas p-2 text-muted hover:text-ink">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </SheetCtx.Provider>
  );
}

/** A button that opens a sheet containing `children`. */
export function SheetButton({
  label,
  title,
  className,
  children,
  disabled,
}: {
  label: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" disabled={disabled} className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Sheet>
    </>
  );
}

"use client";

import { useId, useRef, type ReactNode } from "react";
import { Plus, X } from "lucide-react";

export function CreateDialog({ label, children }: { label: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-4 font-semibold text-slate-900 hover:bg-white">
        <Plus size={18} /> {label}
      </button>
      <dialog ref={dialog} aria-labelledby={titleId}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(32rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100 backdrop:bg-black/65">
        <header className="mb-4 flex items-center justify-between gap-4">
          <h3 id={titleId} className="text-lg font-semibold">{label}</h3>
          <button type="button" aria-label="Close dialog" onClick={() => dialog.current?.close()}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-slate-800">
            <X size={20} />
          </button>
        </header>
        {children}
      </dialog>
    </>
  );
}

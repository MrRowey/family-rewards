"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

export function RewardPhotoPicker({ currentImage, disabled = false }: { currentImage?: string | null; disabled?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const url = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");

  function clear() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    if (input.current) { input.current.value = ""; input.current.setCustomValidity(""); }
    setPreview(null); setFilename(""); setError("");
  }

  useEffect(() => {
    const form = input.current?.form;
    const dialog = input.current?.closest("dialog");
    function reset() {
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
      if (input.current) { input.current.value = ""; input.current.setCustomValidity(""); }
      setPreview(null); setFilename(""); setError("");
    }
    form?.addEventListener("reset", reset);
    dialog?.addEventListener("close", reset);
    return () => {
      form?.removeEventListener("reset", reset);
      dialog?.removeEventListener("close", reset);
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
    };
  }, []);

  return <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
    <label htmlFor={id} className="flex items-center gap-2 font-semibold text-slate-100"><ImagePlus size={20}/>{currentImage ? "Replace reward photo" : "Add reward photo (optional)"}</label>
    {(preview || currentImage) && <Image src={preview || currentImage || ""} alt={preview ? "Selected reward photo preview" : "Current reward photo"} width={240} height={160} unoptimized className="h-40 w-full rounded-lg bg-slate-900 object-contain" />}
    <input ref={input} id={id} name="photo" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled}
      aria-describedby={id + "-help"} className="block w-full text-sm text-slate-200 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:font-semibold file:text-slate-900"
      onChange={event => {
        const field = event.currentTarget;
        const file = field.files?.[0];
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = null; setPreview(null); setFilename(""); setError(""); field.setCustomValidity("");
        if (!file) return;
        const problem = !["image/png", "image/jpeg", "image/webp"].includes(file.type) ? "Choose a PNG, JPEG or WebP image." : file.size === 0 || file.size > 2 * 1024 * 1024 ? "Choose a non-empty image up to 2 MB." : "";
        if (problem) { setError(problem); field.setCustomValidity(problem); return; }
        url.current = URL.createObjectURL(file); setPreview(url.current); setFilename(file.name);
      }} />
    <p id={id + "-help"} className="text-xs text-slate-400">PNG, JPEG or WebP, up to 2 MB. Stored locally on your server.</p>
    {filename && <p className="break-all text-sm text-slate-300">{filename}</p>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {(filename || error) && <button type="button" disabled={disabled} onClick={clear} className="min-h-11 rounded-lg border border-slate-600 px-3 text-sm">Clear selection</button>}
  </section>;
}

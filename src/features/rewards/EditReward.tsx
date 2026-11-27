"use client";

import { RewardPhotoPicker } from "./RewardPhotoPicker";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { CreateDialog } from "@/features/admin/CreateDialog";
import type { RewardItem } from "@/features/admin/types";

export function EditReward({ reward, refresh }: { reward: RewardItem; refresh: () => Promise<void> }) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const fields = new FormData(event.currentTarget);
    const archiveAction = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-archive");
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      let changes: Record<string, unknown>;
      if (archiveAction) {
        changes = { isArchived: !reward.isArchived };
      } else {
        changes = {
          title: fields.get("title"), description: fields.get("description"), category: fields.get("category"), icon: fields.get("icon"),
          starCost: Number(fields.get("starCost")), monthlyStock: Number(fields.get("monthlyStock")),

        };
        const stock = event.currentTarget.elements.namedItem("currentStock");
        if (stock instanceof HTMLInputElement && stock.value !== stock.defaultValue) {
          changes.currentStock = Number(stock.value);
          changes.expectedCurrentStock = Number(stock.defaultValue);
        }
        const photo = fields.get("photo");
        if (photo instanceof File && photo.size) {
          const upload = new FormData();
          upload.set("file", photo);
          const response = await fetch("/api/upload", { method: "POST", body: upload });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Could not upload photo.");
          changes.imageURL = result.imageUrl;
        } else if (fields.has("removePhoto")) {
          changes.imageURL = null;
        }
      }
      const response = await fetch("/api/parent/rewards", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reward.id, ...changes }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not update prize.");
      }
      form.reset();
      await refresh();
      setMessage(archiveAction ? (reward.isArchived ? "Restored to inventory." : "Archived.") : "Changes saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update prize.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const inputClass = "min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3";
  return (
    <CreateDialog label="Edit reward" showPlus={false}>
      <form key={JSON.stringify([reward.title, reward.description, reward.category, reward.icon, reward.starCost, reward.monthlyStock, reward.currentStock, reward.imageURL, reward.isArchived])} onSubmit={update} className="space-y-3 text-sm">
        <fieldset disabled={busy} className="space-y-3">
        <label className="grid gap-1">Title<input required name="title" maxLength={150} defaultValue={reward.title} className={inputClass} /></label>
        <label className="grid gap-1">Description<textarea name="description" maxLength={1000} defaultValue={reward.description ?? ""} className={inputClass + " py-2"} /></label>
        <label className="grid gap-1">Category<input name="category" maxLength={60} defaultValue={reward.category ?? ""} className={inputClass} /></label>
        <label className="grid gap-1">Icon emoji<input required name="icon" maxLength={20} defaultValue={reward.icon} className={inputClass} /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["starCost", "Star cost", reward.starCost, 1],
            ["monthlyStock", "Monthly stock", reward.monthlyStock, 1],
            ["currentStock", "Available stock", reward.currentStock, 0],
          ] as const).map(([name, label, value, min]) => <label key={name} className="grid min-w-0 gap-1">{label}
            <input required type="number" name={name} min={min} max={1000000} defaultValue={value} className={inputClass + " w-full"} />
          </label>)}
        </div>
        <p className="text-xs text-slate-400">Available stock excludes units already reserved by pending claims. Monthly stock is the restock setting.</p>
        <RewardPhotoPicker currentImage={reward.imageURL} disabled={busy} />
        {reward.imageURL && <label className="flex items-center gap-2"><input type="checkbox" name="removePhoto" /> Remove current photo</label>}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-slate-100 px-4 font-semibold text-slate-900">{busy ? "Saving..." : "Save changes"}</button>
          <button type="submit" data-archive="true" formNoValidate disabled={busy}
            className="min-h-11 rounded-lg border border-slate-700 px-4">{reward.isArchived ? "Restore reward" : "Archive reward"}</button>
        </div>
        <output className="block text-sm text-slate-300">{message}</output>
      </form>
    </CreateDialog>
  );
}

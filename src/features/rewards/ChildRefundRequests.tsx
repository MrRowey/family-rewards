"use client";

import { useEffect, useRef, useState } from "react";

interface RedeemedPrize {
  id: string;
  status: string;
  refundState: string | null;
  reward: { title: string };
}

export function ChildRefundRequests({ childId }: { childId: string }) {
  const submissionVersion = useRef(0);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [items, setItems] = useState<RedeemedPrize[]>();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let requestVersion = 0;
    async function refresh() {
      if (document.hidden) return;
      const request = ++requestVersion;
      const submitted = submissionVersion.current;
      try {
        const response = await fetch("/api/kiosk/refund-requests?" + new URLSearchParams({ childId }), {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) throw new Error();
        const next: RedeemedPrize[] = await response.json();
        if (!controller.signal.aborted && request === requestVersion && submitted === submissionVersion.current) {
          setItems(next);
          setRefreshFailed(false);
        }
      } catch {
        if (!controller.signal.aborted && request === requestVersion) setRefreshFailed(true);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [childId]);

  async function requestRefund(redemptionId: string) {
    if (pending) return;
    setPending(redemptionId);
    setMessage("");
    try {
      const response = await fetch("/api/kiosk/refund-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, redemptionId }),
      });
      if (!response.ok) throw new Error();
      submissionVersion.current++;
      setItems((previous) => previous?.map((item) => item.id === redemptionId ? { ...item, refundState: "PENDING" } : item));
      setMessage("Refund requested.");
    } catch {
      setMessage("Could not request a refund. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <details className="rounded-2xl border border-slate-800 p-4">
      <summary className="cursor-pointer font-bold">Redeemed prizes</summary>
      <output className="mt-2 block text-sm text-slate-300">{refreshFailed ? "Could not refresh redeemed prizes. Trying again…" : message || (!items && "Loading redeemed prizes…")}</output>
      {items?.length === 0 && <p className="text-sm text-slate-300">No redeemed prizes yet.</p>}
      <ul className="mt-2 space-y-2">
        {items?.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-3">
            <span>{item.reward.title}</span>
            {item.status === "REFUNDED" ? <span>Refunded</span>
              : item.refundState === "PENDING" ? <span>Waiting for parent</span>
              : item.refundState === "DECLINED" ? <span>Refund declined</span>
              : <button type="button" disabled={pending !== null} onClick={() => requestRefund(item.id)}
                  className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm">Request refund</button>}
          </li>
        ))}
      </ul>
    </details>
  );
}

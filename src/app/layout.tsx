"use client";

import React, { useState, useEffect } from "react";
import "./globals.css";

interface HealthCheckResponse {
  status: string;
  error?: string;
  checks?: {
    database?: { latencyMs: number };
    config?: { isConfigured: boolean };
  };
}

function DevDiagnosticOverlay() {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthCheckResponse) => setHealth(data))
      .catch((err) =>
        setHealth({ status: "CRITICAL_ERROR", error: err.message })
      );
  }, []);

  if (!health) return null;

  const isOk = health.status === "OK";

  return (
    <div className="fixed top-0 left-0 right-0 z-50 text-xs font-mono">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`px-4 py-1.5 flex items-center justify-between cursor-pointer select-none border-b shadow-md ${
          isOk
            ? "bg-slate-900/90 text-emerald-400 border-emerald-500/30"
            : "bg-red-950/95 text-red-300 border-red-500/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-black">
            {isOk ? "🟢 DEV DIAGNOSTICS: OK" : "🔴 DEV DIAGNOSTICS: ERROR"}
          </span>
          {isOk ? (
            <span className="text-slate-400">
              DB: {health.checks?.database?.latencyMs}ms | Configured:{" "}
              {health.checks?.config?.isConfigured ? "Yes" : "No"}
            </span>
          ) : (
            <span className="text-red-400 font-bold">
              Check database connection!
            </span>
          )}
        </div>
        <span className="text-slate-400 underline">
          {expanded ? "Hide Details ▲" : "Inspect Diagnostics ▼"}
        </span>
      </div>

      {expanded && (
        <div className="bg-slate-950/95 border-b border-slate-800 p-4 text-slate-300 max-h-60 overflow-y-auto">
          <pre className="text-[11px] font-mono leading-relaxed">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="h-full min-h-screen bg-slate-950 text-slate-100 antialiased pt-8">
        <DevDiagnosticOverlay />
        {children}
      </body>
    </html>
  );
}
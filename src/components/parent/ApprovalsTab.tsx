"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PendingApproval } from "@/types";

interface ApprovalsTabProps {
  approvals: { pendingTasks: PendingApproval[]; pendingRewards: PendingApproval[] };
  onProcess: (id: string, type: "TASK" | "REWARD", action: "APPROVE" | "DECLINE") => void;
}

export function ApprovalsTab({ approvals, onProcess }: ApprovalsTabProps) {
  const isEmpty = approvals.pendingTasks.length === 0 && approvals.pendingRewards.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Pending Approval Requests</h2>

      {isEmpty ? (
        <Card className="border-dashed text-center p-12 text-slate-500">
          🎉 No pending approvals! All tasks and rewards have been processed.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {approvals.pendingTasks.map((app) => (
            <Card key={app.id} className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{app.child.avatar}</span>
                <div>
                  <h3 className="font-bold text-lg">{app.child.name} completed:</h3>
                  <p className="text-slate-300 font-black text-xl flex items-center gap-2">
                    <span>{app.task?.icon}</span> {app.task?.title}
                  </p>
                  <span className="text-xs font-bold text-amber-400">Award: +{app.task?.starValue} Stars</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="danger" onClick={() => onProcess(app.id, "TASK", "DECLINE")}>
                  <X className="w-5 h-5" />
                </Button>
                <Button variant="success" onClick={() => onProcess(app.id, "TASK", "APPROVE")}>
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          ))}

          {approvals.pendingRewards.map((red) => (
            <Card key={red.id} className="flex items-center justify-between p-5 border-amber-500/30">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{red.child.avatar}</span>
                <div>
                  <h3 className="font-bold text-lg">{red.child.name} wants to redeem:</h3>
                  <p className="text-amber-400 font-black text-xl flex items-center gap-2">
                    <span>{red.reward?.icon}</span> {red.reward?.title}
                  </p>
                  <span className="text-xs font-bold text-slate-400">Cost: {red.reward?.starCost} Stars</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="danger" onClick={() => onProcess(red.id, "REWARD", "DECLINE")}>
                  <X className="w-5 h-5" />
                </Button>
                <Button variant="success" onClick={() => onProcess(red.id, "REWARD", "APPROVE")}>
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
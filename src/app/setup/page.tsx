"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, Lock, ArrowRight, CheckCircle2} from "lucide-react";

export default function FirstTimeSetup() {
  const router = useRouter();

  // Custom Pin Length ( 4 to 8 Digits)
  const [pinLength, setPinLength] = useState<number>(4);

  // PIN Inputs ( Starts Empty)
  const [parentPin, setParentPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Form State
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks 
    if (parentPin.length !== pinLength) {
      setError('Your security Pin mus be exactly ${pinLength} digits long.');
      return;
    }
  
    if (parentPin !== confirmPin) {
      setError("PINs do not match. Please verify your PIN entry.");
      return;
    }

    setSubmitting(true);

    try{
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "applicaion/json"},
        body: JSON.stringify({
          parentPin,
          isConfigured: true,
        }),
      });

      if (res.ok) {
        router.push("/parent");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save setup configuration.");
      }
    } catch (err) {
      setError("Network error during Setup. Please try again.");
    } finally {
      setSubmitting(false);
    }  
  };

  }

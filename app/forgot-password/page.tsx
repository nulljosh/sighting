"use client";

import { useState } from "react";
import { spark } from "@/lib/spark";

export default function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await spark.auth.resetPasswordForEmail(form.get("email") as string, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="shell narrow">
        <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 8 }}>Check your email</h1>
        <p>If that account exists, a password reset link is on its way.</p>
      </div>
    );
  }

  return (
    <div className="shell narrow">
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 24 }}>forgot password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="email" />
        {error && <p className="err">{error}</p>}
        <button disabled={submitting} className="btn-solid">
          {submitting ? "sending..." : "send reset link"}
        </button>
      </form>
    </div>
  );
}

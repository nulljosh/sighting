"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { spark } from "@/lib/spark";

export default function ResetPassword() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await spark.auth.updateUser({
      password: form.get("password") as string,
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else router.push("/");
  }

  return (
    <div className="shell narrow">
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 24 }}>set a new password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input name="password" type="password" required minLength={6} placeholder="new password" />
        {error && <p className="err">{error}</p>}
        <button disabled={submitting} className="btn-solid">
          {submitting ? "saving..." : "save password"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { spark } from "@/lib/spark";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await spark.auth.signInWithPassword({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else router.push("/");
  }

  return (
    <div className="shell narrow">
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 24 }}>Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="email" />
        <input name="password" type="password" required placeholder="password" />
        {error && <p className="err">{error}</p>}
        <button disabled={submitting} className="btn-solid">
          {submitting ? "logging in..." : "log in"}
        </button>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <Link href="/register" >Register</Link>
        <Link href="/forgot-password" >Forgot password?</Link>
      </div>
    </div>
  );
}

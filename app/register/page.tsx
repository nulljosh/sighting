"use client";

import { useState } from "react";
import Link from "next/link";
import { spark } from "@/lib/spark";

export default function Register() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await spark.auth.signUp({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="shell narrow">
        <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 8 }}>Check your email</h1>
        <p>We sent a confirmation link to finish creating your account.</p>
      </div>
    );
  }

  return (
    <div className="shell narrow">
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 24 }}>register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="email" />
        <input name="password" type="password" required minLength={8} placeholder="password" />
        {error && <p className="err">{error}</p>}
        <button disabled={submitting} className="btn-solid">
          {submitting ? "creating account..." : "register"}
        </button>
      </form>
      <Link href="/login" className="block mt-4 ">already have an account? log in</Link>
    </div>
  );
}

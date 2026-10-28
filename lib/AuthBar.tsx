"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { spark } from "@/lib/spark";

export default function AuthBar() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    spark.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = spark.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email === undefined) return null;

  if (email) {
    return (
      <span style={{ color: "var(--text2)" }}>
        {email} ·{" "}
        <button onClick={() => spark.auth.signOut()} style={{ all: "unset", cursor: "pointer", color: "var(--accent)" }}>
          Log out
        </button>
      </span>
    );
  }

  return (
    <Link href="/login">
      Log in
    </Link>
  );
}

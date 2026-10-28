"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { spark, Listing } from "@/lib/spark";
import { geocode } from "@/lib/geo";

export default function PostListing() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);

    let photo_url: string | null = null;
    if (photo) {
      const path = `${crypto.randomUUID()}-${photo.name}`;
      const { data, error } = await spark.storage.from("pet-photos").upload(path, photo);
      if (!error && data) {
        photo_url = spark.storage.from("pet-photos").getPublicUrl(data.path).data.publicUrl;
      }
    }

    const spot = await geocode(String(form.get("last_seen_location")));
    const { data, error } = await spark
      .rpc("create_listing", {
        ...spot,
        type: form.get("type"),
        species: form.get("species"),
        last_seen_location: form.get("last_seen_location"),
        pet_name: form.get("pet_name"),
        color: form.get("color"),
        description: form.get("description"),
        tag_number: form.get("tag_number"),
        contact_phone: form.get("contact_phone"),
        contact_email: form.get("contact_email"),
        reward: form.get("reward") || null,
        sex: form.get("sex") || null,
        last_seen_at: form.get("last_seen_at") || null,
        photo_url,
      })
      .single();

    setSubmitting(false);
    if (!error && data) {
      setEditToken((data as Listing).edit_token ?? null);
    }
  }

  if (editToken) {
    return (
      <div className="shell narrow">
        <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 8 }}>Listing posted!</h1>
        <p className="mb-4">
          Save this link to edit or mark your listing resolved later — it won&apos;t be shown again:
        </p>
        <code style={{ display: "block", background: "var(--surface)", padding: 16, borderRadius: 20, wordBreak: "break-all", marginBottom: 16 }}>
          {typeof window !== "undefined" ? window.location.origin : ""}/listing/edit?token={editToken}
        </code>
        <button onClick={() => router.push("/board")} className="">
          Back to the board
        </button>
      </div>
    );
  }

  return (
    <div className="shell narrow">
      <h1 style={{ fontSize: 34, lineHeight: "40px", fontWeight: 700, marginBottom: 24 }}>Post a lost or found pet</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="field">
          Type
          <select name="type" required>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </label>
        <label className="field">
          Pet name (if known)
          <input name="pet_name" />
        </label>
        <label className="field">
          Species
          <input name="species" required placeholder="Cat, dog, ..." />
        </label>
        <label className="field">
          Color / description
          <input name="color" />
        </label>
        <label className="field">
          Notes (temperament, identifying marks, etc.)
          <textarea name="description" />
        </label>
        <label className="field">
          Ear tattoo / tag / chip number
          <input name="tag_number" />
        </label>
        <label className="field">
          Last seen location
          <input name="last_seen_location" required />
        </label>
        <label className="field">
          Last seen date
          <input name="last_seen_at" type="date" />
        </label>
        <label className="field">
          Sex
          <select name="sex">
            <option value="">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="field">
          Reward (optional)
          <input name="reward" placeholder="$1000" />
        </label>
        <label className="field">
          Photo
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
           
          />
        </label>
        <label className="field">
          Contact phone
          <input name="contact_phone" />
        </label>
        <label className="field">
          Contact email
          <input name="contact_email" type="email" />
        </label>
        <button
          disabled={submitting}
          className="btn-solid"
        >
          {submitting ? "Posting..." : "Post listing"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { spark, Listing } from "@/lib/spark";
import { geocode } from "@/lib/geo";

const STEPS = ["Photo", "The pet", "Where and when", "Contact"];

export default function PostListing() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // One form, one step on screen at a time. Hidden steps still submit their fields, but the
  // browser can't point at a hidden invalid field, so the form is noValidate and steps check here.
  function invalid(i: number) {
    const fields = form.current!.querySelectorAll("fieldset")[i].querySelectorAll<HTMLInputElement>("input, select, textarea");
    return [...fields].find((f) => !f.checkValidity());
  }
  function next() {
    const bad = invalid(step);
    if (bad) return bad.reportValidity();
    setStep(step + 1);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next(); // Enter on an early step means Next
    const first = STEPS.findIndex((_, i) => invalid(i));
    if (first >= 0) {
      setStep(first);
      return setTimeout(() => invalid(first)?.reportValidity());
    }
    setSubmitting(true);
    setFailed(false);
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
    } else {
      setFailed(true);
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
      <p style={{ color: "var(--text2)", marginBottom: 16 }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      <form ref={form} onSubmit={handleSubmit} className="steps" noValidate>
        <fieldset hidden={step !== 0}>
          <div className="chips" role="radiogroup" aria-label="Lost or found">
            <label className="choice"><input type="radio" name="type" value="lost" defaultChecked /> I lost a pet</label>
            <label className="choice"><input type="radio" name="type" value="found" /> I found a pet</label>
          </div>
          <label className="field">
            A clear photo helps most
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="preview" src={URL.createObjectURL(photo)} alt="Your photo" />
          )}
        </fieldset>

        <fieldset hidden={step !== 1}>
          <label className="field">Species<input name="species" required placeholder="Cat, dog, ..." /></label>
          <label className="field">Pet name (if known)<input name="pet_name" /></label>
          <label className="field">Color<input name="color" placeholder="Orange tabby, black with white paws" /></label>
          <label className="field">
            Sex
            <select name="sex">
              <option value="">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="field">Ear tattoo, tag or chip number<input name="tag_number" /></label>
          <label className="field">Notes (temperament, identifying marks)<textarea name="description" /></label>
        </fieldset>

        <fieldset hidden={step !== 2}>
          <label className="field">Last seen where<input name="last_seen_location" required placeholder="Street and cross street, city" /></label>
          <label className="field">Last seen date<input name="last_seen_at" type="date" /></label>
        </fieldset>

        <fieldset hidden={step !== 3}>
          <label className="field">Contact phone<input name="contact_phone" type="tel" /></label>
          <label className="field">Contact email<input name="contact_email" type="email" /></label>
          <label className="field">Reward (optional)<input name="reward" placeholder="$1000" /></label>
        </fieldset>

        {failed && <p className="err">Couldn&apos;t post that. Check your connection and try again.</p>}
        <div className="step-nav">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="submit" disabled={submitting} className="btn-solid">
            {step < STEPS.length - 1 ? "Next" : submitting ? "Posting..." : "Post listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

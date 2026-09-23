"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useRef, useState } from "react";
import { Letterbox } from "./Letterbox";
import s from "./post.module.css";

type Field = "name" | "email" | "message";
type Values = Record<Field, string> & { website: string };
type Outcome = { ok: true } | { ok: false; message: string };
// sending: the sequence is playing. awaiting: it finished before delivery answered.
type Phase = "idle" | "sending" | "awaiting" | "posted" | "failed";

const EMPTY: Values = { name: "", email: "", message: "", website: "" };
const DELIVERY_TIMEOUT_MS = 15000;

export function validate(v: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!v.name.trim()) errors.name = "Add your name.";
  else if (v.name.trim().length > 100) errors.name = "That name is longer than 100 characters.";
  if (!v.email.trim()) errors.email = "Add an email address, so a reply can find you.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
    errors.email = "That email address doesn’t look complete.";
  if (v.message.trim().length < 10) errors.message = "Write a few more words first.";
  else if (v.message.length > 5000) errors.message = "Letters are limited to 5,000 characters.";
  return errors;
}

// Never throws and never blocks the animation: resolves with the outcome whenever the server answers.
async function deliver(v: Values): Promise<Outcome> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const res = await fetch("/api/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
      signal: abort.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) return { ok: true };
    return { ok: false, message: data.error ?? "The letter couldn’t be delivered." };
  } catch {
    return {
      ok: false,
      message: abort.signal.aborted
        ? "The post office didn’t answer in time."
        : "The letter couldn’t leave: check your connection.",
    };
  } finally {
    clearTimeout(timer);
  }
}

const loadSequence = () => import("./sequence");

export function PostDesk() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [attempted, setAttempted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [failure, setFailure] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const letterbox = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const fields = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const busy = phase === "sending" || phase === "awaiting";

  const update =
    (field: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [field]: e.target.value };
      setValues(next);
      if (attempted) setErrors(validate(next));
      if (phase === "posted" || phase === "failed") setPhase("idle");
    };

  const finish = (outcome: Outcome, sent: Values) => {
    if (outcome.ok) {
      setPhase("posted");
      setAnnouncement("Posted.");
      setValues(EMPTY);
      setAttempted(false);
    } else {
      setPhase("failed");
      setFailure(outcome.message);
      setAnnouncement(`Not posted. ${outcome.message} Your letter is still in the form.`);
      setValues(sent);
    }
    requestAnimationFrame(() => status.current?.focus());
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found = validate(values);
    setAttempted(true);
    setErrors(found);
    const first = (["name", "email", "message"] as const).find((f) => found[f]);
    if (first) {
      fields.current[first]?.focus();
      return;
    }

    const sent = values;
    setPhase("sending");
    setAnnouncement("Sending your message…");
    let outcome: Outcome | null = null;
    const delivery = deliver(sent).then((o) => (outcome = o));

    if (reduced) {
      await new Promise((r) => setTimeout(r, 200));
    } else {
      try {
        const { play } = await loadSequence();
        await play({
          textarea: textarea.current!,
          fade: [...form.current!.querySelectorAll<HTMLElement>("[data-fade]")],
          letterbox: letterbox.current!.querySelector("svg")!,
          values: sent,
        });
      } catch {
        // If the animation can't run, the letter is still sent; only the spectacle is skipped.
      }
    }

    if (outcome) finish(outcome, sent);
    else {
      setPhase("awaiting");
      finish(await delivery, sent);
    }
  };

  return (
    <div className={s.desk} data-reduced={reduced || undefined}>
      <form
        ref={form}
        className={s.form}
        noValidate
        onSubmit={onSubmit}
        onFocus={() => void loadSequence()}
        aria-describedby="post-status"
        inert={busy || undefined}
        data-busy={busy || undefined}
      >
        {(["name", "email"] as const).map((f) => (
          <div key={f} className={s.field} data-fade="">
            <label htmlFor={`post-${f}`} className={s.label}>
              {f === "name" ? "Your name" : "Your email"}
            </label>
            <input
              ref={(el) => {
                fields.current[f] = el;
              }}
              id={`post-${f}`}
              name={f}
              type={f === "email" ? "email" : "text"}
              autoComplete={f}
              className={s.input}
              value={values[f]}
              onChange={update(f)}
              aria-required="true"
              aria-invalid={errors[f] ? true : undefined}
              aria-describedby={errors[f] ? `post-${f}-error` : undefined}
            />
            {errors[f] && (
              <p id={`post-${f}-error`} className={s.error}>
                {errors[f]}
              </p>
            )}
          </div>
        ))}
        <div className={s.field}>
          <label htmlFor="post-message" className={s.label} data-fade="">
            Your letter
          </label>
          <textarea
            ref={(el) => {
              textarea.current = el;
              fields.current.message = el;
            }}
            id="post-message"
            name="message"
            className={s.letter}
            rows={9}
            value={values.message}
            onChange={update("message")}
            aria-required="true"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? "post-message-error" : undefined}
          />
          {errors.message && (
            <p id="post-message-error" className={s.error} data-fade="">
              {errors.message}
            </p>
          )}
        </div>
        {/* Honeypot: invisible to people, tempting to bots. */}
        <div className={s.trap} aria-hidden="true">
          <label htmlFor="post-website">Website</label>
          <input
            id="post-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={update("website")}
          />
        </div>
        <div className={s.actions} data-fade="">
          <button type="submit" className={s.submit} aria-disabled={busy || undefined}>
            Post the letter
          </button>
        </div>
      </form>

      <div className={s.box}>
        <div ref={letterbox} className={s.letterbox}>
          <Letterbox />
        </div>
        <p ref={status} id="post-status" tabIndex={-1} className={s.status} data-phase={phase}>
          {phase === "awaiting" && "Posting…"}
          {phase === "posted" && (
            <>
              <span className={s.posted}>Posted.</span>{" "}
              <span className={s.statusNote}>It’s in the box.</span>
            </>
          )}
          {phase === "failed" && (
            <>
              <span className={s.posted}>Not posted.</span>{" "}
              <span className={s.statusNote}>
                {failure} Your letter is still here; try again in a moment.
              </span>
            </>
          )}
        </p>
      </div>

      <p className="visually-hidden" aria-live="polite" role="status">
        {announcement}
      </p>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { asset } from "@/lib/base-path";
import resumes from "@/content/resumes.json";
import s from "./Resumes.module.css";

// Edited through the local admin (content/resumes.json); PDFs and previews live in public/resumes.
const RESUMES: { file: string; role: string; note: string }[] = resumes;

// One manila folder. Hover, focus or tap it and the résumés pop up out of it in a fan; each sheet
// opens its PDF. Download links sit underneath, so nothing depends on the animation.
export function Resumes() {
  const [open, setOpen] = useState(false);
  const n = RESUMES.length;
  return (
    <section id="resumes" className={s.resumes} aria-labelledby="resumes-title">
      <h2 id="resumes-title" className={s.title}>
        Résumés
      </h2>
      <div
        className={s.stage}
        data-open={open || undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        onFocus={(e) => e.target.tagName !== "BUTTON" && setOpen(true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      >
        <div className={s.back} aria-hidden="true" />
        <ul className={s.sheets}>
          {RESUMES.map((r, i) => (
            <li key={r.file} style={{ "--i": i, "--n": n } as React.CSSProperties}>
              <a
                href={asset(`/resumes/${r.file}.pdf`)}
                target="_blank"
                rel="noopener noreferrer"
                className={s.sheet}
                tabIndex={open ? 0 : -1}
              >
                <Image
                  src={`/resumes/${r.file}.png`}
                  alt=""
                  width={935}
                  height={1210}
                  sizes="10rem"
                />
                <span className={s.tag}>{r.role}</span>
                <span className="visually-hidden"> résumé (PDF, opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className={s.front}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={s.label}>Résumés</span>
          <span className={s.hint}>{open ? "Pick one" : "Open the folder"}</span>
        </button>
      </div>
      <ul className={s.downloads}>
        {RESUMES.map((r) => (
          <li key={r.file}>
            <span className={s.dlRole}>{r.role}</span>
            <span className={s.dlNote}>{r.note}</span>
            <a href={asset(`/resumes/${r.file}.pdf`)} download>
              Download<span className="visually-hidden"> the {r.role} résumé</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

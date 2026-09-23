import { home, type Slot } from "@/content/home";
import s from "./MarginNotes.module.css";

export function MarginNotes({ near, className }: { near: Slot; className?: string }) {
  const notes = home.annotations.filter((a) => a.near === near);
  if (!notes.length) return null;
  return (
    <div className={[s.notes, className].filter(Boolean).join(" ")} data-near={near}>
      {notes.map((note) => (
        <p key={note.id} className={s.note}>
          {note.text}
        </p>
      ))}
    </div>
  );
}

import { fieldLabel } from "@/lib/research-fields";
import s from "./Field.module.css";

export function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <section className={s.field} aria-labelledby={`field-${name}`}>
      <h2 id={`field-${name}`} className={s.label}>
        {fieldLabel(name)}
      </h2>
      <div className={s.content}>{children}</div>
    </section>
  );
}

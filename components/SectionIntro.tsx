import s from "./SectionIntro.module.css";

export function SectionIntro({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <header className={s.intro}>
      <h1 className={s.title}>{title}</h1>
      {meta && <p className={s.meta}>{meta}</p>}
    </header>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={s.empty}>{children}</p>;
}

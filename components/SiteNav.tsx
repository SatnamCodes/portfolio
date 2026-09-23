"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { navItems, PAGE_TRANSITION, site } from "@/lib/site";
import s from "./SiteNav.module.css";

function currentState(pathname: string, href: string): "page" | "true" | undefined {
  if (pathname === href) return "page";
  if (href !== "/" && pathname.startsWith(`${href}/`)) return "true";
  return undefined;
}

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={s.masthead}>
      <Link href="/" className={s.wordmark} transitionTypes={[PAGE_TRANSITION]}>
        {site.owner}
      </Link>

      <nav aria-label="Primary" className={s.nav}>
        <button
          ref={toggleRef}
          type="button"
          className={s.toggle}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpenedAt(pathname);
            setOpen((o) => !o);
          }}
        >
          {open ? "Close" : "Contents"}
        </button>

        <ul id={listId} className={s.list} data-open={open}>
          {navItems.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className={s.link}
                aria-current={currentState(pathname, href)}
                transitionTypes={[PAGE_TRANSITION]}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

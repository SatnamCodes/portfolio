import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import type { MDXComponents } from "mdx/types";
import { mulberry32 } from "@/lib/session-seed";
import s from "./ink.module.css";

const WORD_VARIANTS = 12;
const PARAGRAPH_VARIANTS = 4;

// Above this, per-word spans cost more DOM than the texture is worth; paragraphs keep their drift.
export const PER_WORD_LIMIT = 4000;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

// Wraps every word in a span carrying one of a handful of ink variants. The sequence is seeded by the
// paragraph's own text, so the same sentence always gets the same hand. Spaces stay as plain text nodes,
// so selection, copying and screen readers see ordinary prose.
function inkify(node: ReactNode, rand: () => number): ReactNode {
  if (typeof node === "string") {
    return node.split(/(\s+)/).map((part, i) =>
      !part || /^\s+$/.test(part) ? (
        part
      ) : (
        <span key={i} className={`${s.word} ${s[`w${Math.floor(rand() * WORD_VARIANTS)}`]}`}>
          {part}
        </span>
      ),
    );
  }
  if (Array.isArray(node)) return Children.map(node, (child) => inkify(child, rand));
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el, undefined, inkify(el.props.children, rand));
  }
  return node;
}

function paragraphClass(children: ReactNode) {
  return s[`p${hash(textOf(children)) % PARAGRAPH_VARIANTS}`];
}

function inked<T extends keyof React.JSX.IntrinsicElements>(Tag: T, perWord: boolean) {
  return function Inked({ children, ...rest }: { children?: ReactNode }) {
    const rand = mulberry32(hash(textOf(children)));
    return createElement(
      Tag,
      { ...rest, className: paragraphClass(children) },
      perWord ? inkify(children, rand) : children,
    );
  };
}

export function inkComponents(words: number): MDXComponents {
  const perWord = words <= PER_WORD_LIMIT;
  return {
    p: inked("p", perWord),
    li: inked("li", perWord),
    h2: inked("h2", perWord),
    h3: inked("h3", perWord),
    blockquote: inked("blockquote", perWord),
  };
}

export function Aside({ children }: { children: ReactNode }) {
  return <aside className={s.aside}>{children}</aside>;
}

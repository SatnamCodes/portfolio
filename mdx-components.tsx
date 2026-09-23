import type { MDXComponents } from "mdx/types";
import { Photo, PullQuote } from "@/components/mdx/Editorial";
import { Field } from "@/components/mdx/Field";
import { Formula, Scan } from "@/components/mdx/Scan";
import { Aside } from "@/components/wanderings/Ink";

const components: MDXComponents = { Field, Scan, Formula, Aside, PullQuote, Photo };

export function useMDXComponents(): MDXComponents {
  return components;
}

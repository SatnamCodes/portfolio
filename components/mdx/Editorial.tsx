import Image from "next/image";
import s from "./Editorial.module.css";

// A line lifted out of the prose and set in the display serif.
export function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className={s.pull}>
      <p>{children}</p>
    </blockquote>
  );
}

// A photograph inside long-form prose, framed with the same restraint as Traces.
export function Photo({
  src,
  alt,
  width,
  height,
  caption,
  wide,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  wide?: boolean;
}) {
  return (
    <figure className={s.photo} data-wide={wide || undefined}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={wide ? "(min-width: 64rem) 64rem, 100vw" : "(min-width: 48rem) 36rem, 100vw"}
      />
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
}

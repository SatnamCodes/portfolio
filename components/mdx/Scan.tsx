import Image from "next/image";
import s from "./Scan.module.css";

// A scanned handwritten page. `transcription` makes the note readable without the image.
export function Scan({
  src,
  alt,
  width,
  height,
  transcription,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  transcription?: string;
}) {
  return (
    <figure className={s.scan}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 64rem) 28rem, 90vw"
      />
      {transcription && (
        <details className={s.transcription}>
          <summary>Transcription</summary>
          <p>{transcription}</p>
        </details>
      )}
    </figure>
  );
}

// Set in the typeset serif, never the handwriting: formulas must stay exact.
export function Formula({ children }: { children: React.ReactNode }) {
  return <p className={s.formula}>{children}</p>;
}

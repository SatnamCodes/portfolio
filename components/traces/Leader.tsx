import Image from "next/image";
import s from "./Leader.module.css";

// Stands on the upper reel: the cut-out figure rises out of the film, with the line written beside it.
// Its cropped lower edge tucks behind the film strip (see .leader's negative margin).
export function Leader() {
  return (
    <div className={s.leader}>
      <Image
        src="/traces/figure.webp"
        width={585}
        height={619}
        sizes="(min-width: 48rem) 22rem, 13rem"
        priority
        className={s.figure}
        alt="Satnam, seen from behind with one hand in their hair and a denim jacket over one shoulder."
      />
      <p className={s.line}>
        A Cartographer of
        <br />
        the Unseen
      </p>
    </div>
  );
}

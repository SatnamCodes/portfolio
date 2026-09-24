# The Questions: narration script and notes

The homepage ends with "The Questions", a generative sequence (about 2 minutes 24 seconds) drawn live on a canvas (`components/questions/`). It uses no video files. Narration is optional: drop an MP3 at `public/audio/the-questions.mp3` and a **Sound on** button appears. The drawing is the clock and the audio follows it, so the timings below are where each line should *start*.

## Narration script (for ElevenLabs)

Generate it as **one file**, one narrator, with silence padded to these start times (or generate line by line and place the lines on a timeline at these marks). Leave the gaps silent: silence is part of the piece.

| Start | Line |
|---|---|
| 0:02.5 | What is knowledge? |
| 0:13.5 | What can be known from what we already know? |
| 0:26 | Can the motion of the heavens and the motion of the earth be described by the same laws? |
| 0:38.5 | What connects electricity and magnetism? |
| 0:50 | What if mathematics can reveal something that experiment has not yet shown us? |
| 1:01 | What happens to time when the speed of light does not change? |
| 1:13 | How large is infinity? |
| 1:22 | Can a formal system prove everything that is true about itself? |
| 1:32 | What does it mean for something to be computable? |
| 1:37 | Can machines think? |
| 1:44 | What if not knowing is not failure? |
| 1:50.5 | Perhaps these were never separate questions. |
| 1:52.5 | What exists? |
| 1:53.7 | What can be known? |
| 1:54.9 | What can be proved? |
| 1:56.1 | What can be measured? |
| 1:57.3 | What can be computed? |
| 1:58.5 | And what does it mean to experience all of it? |
| 2:03 | Perhaps knowledge is like this. |
| 2:05.5 | We divide the world so that we can understand it. |
| 2:07.6 | And then, somewhere deep enough, the divisions begin to disappear. |
| 2:11.5 | What lies between what we know and what remains unknown? |

The timings live in `components/questions/timeline.ts` (`NARRATION`). If the delivered audio runs differently, change the numbers there. The on-screen questions are in `components/questions/scenes/index.ts` (`QUESTIONS`).

### One voice, or characters?
- **Recommended: one narrator.** Almost every question is a *paraphrase* of what a work pursued, not words the person said. Voicing them "as Newton" or "as Einstein" would present invented quotations as theirs.
- **Two lines are genuine quotations** and could be given a second, distinct voice if you want a character moment:
  - Turing (1950): "Can machines think?"
  - Keats (1817): "…uncertainties, Mysteries, doubts…" (on screen only; not in the narration)
- Suggested delivery: unhurried, close-mic, low warmth, questions *asked* rather than announced, about 0.6 s of breath before each.

## Accuracy
`components/questions/sources.ts` records, for each scene, the person, year, work, question, quotation, quotation type (verified or paraphrase), source, and the connection to the next question. On screen, only verified words appear in quotation marks. The same data drives the `/questions` plate.

## Controls
Play/Pause, Sound on/off (only when the MP3 exists), Replay, and a link to the plate. Add `?debug=true` to the URL for a timeline panel (scene, time, seek, audio status). It plays when half the section is on screen, pauses off-screen and in background tabs, and with reduced motion it shows the questions as text plus a still of the prism.

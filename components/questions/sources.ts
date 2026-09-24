// The intellectual genealogy behind "The Questions", kept auditable in code.
// quotationType:
//   "verified"   exact words, checked against the cited source; may be shown in quotation marks
//   "paraphrase" a cinematic paraphrase of the question the work pursued; NEVER shown in quotation marks
export type Source = {
  id: string;
  person: string;
  year: string;
  work: string;
  question: string;
  quotation: string | null;
  quotationType: "verified" | "paraphrase";
  source: string;
  nextConnection: string;
};

export const SOURCES: Source[] = [
  {
    id: "socrates",
    person: "Socrates, as written by Plato",
    year: "c. 369 BCE",
    work: "Theaetetus",
    question: "What is knowledge?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Plato, Theaetetus 145e–146c (Socrates asks what knowledge is; wording varies by translation).",
    nextConnection:
      "Knowledge that cannot be doubted: Euclid builds certainty from definitions and postulates.",
  },
  {
    id: "euclid",
    person: "Euclid",
    year: "c. 300 BCE",
    work: "Elements",
    question: "What can be known from what we already know?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Euclid, Elements, Book I (definitions, postulates, Proposition 1: the equilateral triangle by compass and straightedge).",
    nextConnection:
      "Geometry applied to motion: conic sections become orbits in Newton's Principia.",
  },
  {
    id: "newton",
    person: "Isaac Newton",
    year: "1687",
    work: "Philosophiæ Naturalis Principia Mathematica",
    question:
      "Can the motion of the heavens and the motion of the earth be described by the same laws?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Newton, Principia (1687), Book III: universal gravitation unites terrestrial and celestial motion.",
    nextConnection:
      "Action at a distance left open: Faraday pictures the space between as lines of force.",
  },
  {
    id: "faraday",
    person: "Michael Faraday",
    year: "1831",
    work: "Experimental Researches in Electricity",
    question: "What connects electricity and magnetism?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Faraday, Experimental Researches in Electricity, First Series (1831): electromagnetic induction; lines of force.",
    nextConnection: "Maxwell translates Faraday's lines of force into mathematics.",
  },
  {
    id: "maxwell",
    person: "James Clerk Maxwell",
    year: "1865",
    work: "A Dynamical Theory of the Electromagnetic Field",
    question: "What if mathematics can reveal something that experiment has not yet shown us?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Maxwell, A Dynamical Theory of the Electromagnetic Field (1865). The four equations are shown in the later vector form due to Heaviside.",
    nextConnection:
      "The equations predict waves travelling at the speed of light: light is electromagnetic.",
  },
  {
    id: "einstein",
    person: "Albert Einstein",
    year: "1905",
    work: "On the Electrodynamics of Moving Bodies",
    question: "What happens to time when the speed of light does not change?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Einstein, Zur Elektrodynamik bewegter Körper, Annalen der Physik 17 (1905); general relativity 1915 (Riemannian geometry).",
    nextConnection:
      "Physics rests on mathematics; mathematics now asks about its own foundations and infinities.",
  },
  {
    id: "cantor",
    person: "Georg Cantor",
    year: "1891",
    work: "Über eine elementare Frage der Mannigfaltigkeitslehre",
    question: "How large is infinity?",
    quotation: null,
    quotationType: "paraphrase",
    source: "Cantor (1891): the diagonal argument; some infinities are larger than others.",
    nextConnection: "The diagonal method returns as self-reference in Gödel.",
  },
  {
    id: "godel",
    person: "Kurt Gödel",
    year: "1931",
    work: "On Formally Undecidable Propositions of Principia Mathematica and Related Systems",
    question: "Can a formal system prove everything that is true about itself?",
    quotation: null,
    quotationType: "paraphrase",
    source:
      "Gödel, Monatshefte für Mathematik und Physik 38 (1931): incompleteness via a self-referential sentence.",
    nextConnection: "Turing turns formal procedure into a machine and meets the same limit.",
  },
  {
    id: "turing",
    person: "Alan Turing",
    year: "1936 · 1950",
    work: "On Computable Numbers (1936); Computing Machinery and Intelligence (1950)",
    question: "What does it mean for something to be computable?",
    quotation: "Can machines think?",
    quotationType: "verified",
    source:
      "Turing, Computing Machinery and Intelligence, Mind 59 (1950), opening line: “I propose to consider the question, ‘Can machines think?’”",
    nextConnection: "From what machines can do back to what it is like to be the one asking.",
  },
  {
    id: "keats",
    person: "John Keats",
    year: "1817",
    work: "Letter to George and Tom Keats",
    question: "What if not knowing is not failure?",
    quotation: "uncertainties, Mysteries, doubts",
    quotationType: "verified",
    source:
      "Keats, letter to George and Tom Keats, December 1817: “…when man is capable of being in uncertainties, Mysteries, doubts, without any irritable reaching after fact & reason”.",
    nextConnection: "Every road returns: the questions converge.",
  },
];

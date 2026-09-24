# Admin: writing and publishing without code

A small local app for adding and editing site content through forms. It runs **only on your computer**: it listens on 127.0.0.1, needs the one-time link printed when it starts, and is not part of the website build, so it never goes online.

## Use it
```bash
npm run admin
```
Your browser opens the admin. If it doesn't, open the link printed in the terminal (it includes a fresh secret each time).

1. Pick what you're writing: **Essay (Roads)**, **Research entry**, **Project**, **Book or notes (Shelves)**, or **Thought (Wanderings)**.
2. Fill in the form. Required fields are starred. The preview on the right updates as you type.
   - Text uses simple formatting: a blank line starts a new paragraph; `**bold**`, `*italic*`, `## Heading`, `- list item`, `[link text](https://…)`.
   - Research entries have one box per section (Question, Motivation, Method, …); fill in the ones you have.
   - Tick **Keep as draft** to save something without it appearing on the live site.
3. **Save** writes the file on your computer. To edit something, click it under "Existing" and Save again.
4. When you're ready, write a short note under **Publish** and press **Publish to the site**. The admin checks every entry (required fields, dates, links, and that the text is valid), then commits and pushes to GitHub. Vercel rebuilds the live site in about a minute, and the GitHub Pages copy follows.

If the check finds a problem, nothing is published and it tells you which file and what to fix.

## Site text
Under **Site text** in the sidebar:
- **Homepage:** the heading, your manifesto (a blank line between paragraphs; a line starting `# ` is a section heading; everything else is kept exactly as you type it), the margin notes, the seven interests beside the prism (red → violet), the path, and the prism's description for screen readers.
- **New Beginnings:** your story. `## Chapter title` starts a chapter; untick "placeholder" when it's real.
- **Résumés:** the role and one-line description for each, their order, and **replacing a PDF** (choose a file; its preview image is made for you). You can add or remove résumés.

## Notes
- Publishing uses your normal git login, the same as pushing from VS Code.
- Delete removes the file; it can still be recovered from git history.
- Photos for Traces are still added through `content/traces/traces.json` (ask Claude, or add them by hand).

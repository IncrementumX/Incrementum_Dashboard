# wiki-ingest — Karpathy Ingest operation

Process all unprocessed articles from `IncrementumOS/raw/articles/` into the wiki.

## Steps

1. **Find unprocessed articles**
   - Glob `IncrementumOS/raw/articles/*.md`
   - For each file, read the frontmatter and check if `status: unprocessed`
   - If no unprocessed files exist, report that clearly and stop

2. **For each unprocessed article**, do the following:

   a. Read the full file content

   b. Determine the wiki destination based on content:
      - `wiki/philosophy/` — Eduardo's investment principles, beliefs, mental models, risk frameworks
      - `wiki/framework/` — checklists, criteria, processes, operational rules (how-to)
      - `wiki/teses/` — thesis on a specific asset/ticker/theme (long, short, watchlist)

   c. Determine if this content belongs to an **existing wiki page** or needs a **new page**:
      - Read `wiki/index.md` to see what pages already exist
      - If an existing page clearly covers the same topic, plan to update it
      - Otherwise, create a new page with a descriptive kebab-case filename (e.g., `macro-as-filter.md`)

   d. For a **new page**: synthesize the article into a clean wiki page
      - Title: clear, descriptive `# Title`
      - Body: synthesized markdown — key insights, frameworks, principles extracted from the article
      - Keep it concise but substantive; focus on what is useful for Eduardo's investment system
      - Do NOT copy-paste raw article text; synthesize into structured wiki content

   e. For an **existing page** with more than 10 lines: show the diff (what you plan to add/change) and wait for confirmation before writing

   f. Write the wiki page to `IncrementumOS/wiki/<destination>/<slug>.md`

   g. Update `IncrementumOS/wiki/index.md`:
      - Append to the correct section (`## philosophy/`, `## framework/`, or `## teses/`):
        ```
        - [Page Title](destination/slug.md) — one-line summary
        ```

   h. Append to `IncrementumOS/wiki/log.md`:
      ```
      ## YYYY-MM-DD

      - ingested — `raw/articles/<filename>` → `wiki/<destination>/<slug>.md` (<one-line rationale>)
      ```

   i. Update the article's frontmatter: change `status: unprocessed` to `status: processed`

3. **Report** what was processed:
   - List each article processed
   - List each wiki page created or updated
   - Note any articles skipped (with reason)

## Constraints

- Dates are always ISO format `YYYY-MM-DD` — never relative
- New wiki page filenames: `<kebab-case-slug>.md` — no date prefix (date goes in log.md only)
- Never modify raw source files except updating the `status` frontmatter field
- Never invent financial data or claims not present in the source article
- If the article's topic doesn't fit any of the three destinations clearly, ask before proceeding

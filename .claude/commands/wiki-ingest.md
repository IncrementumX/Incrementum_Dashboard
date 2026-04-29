# wiki-ingest — Karpathy Ingest operation

Process all unprocessed articles from `IncrementumOS/raw/articles/` and `IncrementumOS/raw/readings/` into the wiki.

## Steps

1. **Find unprocessed articles**
   - Glob `IncrementumOS/raw/articles/*.md` and `IncrementumOS/raw/readings/**/*.md`
   - For each file, read the frontmatter and check if `status: unprocessed`
   - If no unprocessed files exist, report that clearly and stop

2. **Before processing any article**, read `IncrementumOS/wiki/index.md` once to map all existing pages.

3. **For each unprocessed article**, determine its **ingest plan** before writing anything:

   a. Read the full file content

   b. Determine which wiki pages this article touches. A single source can touch multiple pages — list all of them before writing any:
      - `framework/` subfolder — Eduardo's investment principles, beliefs, mental models, checklists, criteria, processes, operational rules
      - `macro/` subfolder — time-sensitive macro analysis with a clear macroeconomic driver
      - `assets/` subfolder — coverage and thesis on a specific asset or sector (flat — one file per asset)
      - `portfolio/decisions/` subfolder — tactical portfolio decision (execute or don't-follow); naming: `YYYY-MM-DD-asset-action.md`

      These are subfolders within `IncrementumOS/wiki/`. The full path to write is always:
      `IncrementumOS/wiki/<subfolder>/<slug>.md`
      (e.g., `IncrementumOS/wiki/macro/gold-liquidity-vs-repricing.md` — never `IncrementumOS/wiki/wiki/...`)

   c. For each target wiki page:
      - Check the index map from step 2 to determine: **new page** or **existing page**?

   d. Present the full ingest plan (which pages will be created/updated) before making any writes. Proceed unless the article is clearly off-topic.

4. **Execute the ingest plan** — for each target page in order:

   a. For a **new page**: synthesize the article content into a clean wiki page
      - Title: clear, descriptive `# Title`
      - Body: synthesized markdown — key insights, frameworks, principles extracted from the article
      - Keep it concise but substantive; focus on what is useful for Eduardo's investment system
      - Do NOT copy-paste raw article text; synthesize into structured wiki content

   b. For an **existing page** with more than 10 lines: show the diff (what you plan to add/change) and wait for confirmation before writing

   c. Write the wiki page to `IncrementumOS/wiki/<subfolder>/<slug>.md`

   d. Update `IncrementumOS/wiki/index.md` **only if this is a new page** (not an update to an existing page):
      - Append to the correct section (`## framework/`, `## macro/`, `## assets/`, or `## portfolio/decisions/`):
        ```
        - [Page Title](subfolder/slug.md) — one-line summary
        ```

5. **After all pages for this article are written**, append to `IncrementumOS/wiki/log.md`:
   - Check if a `## YYYY-MM-DD` header for today already exists in log.md
   - If it **exists**: append the new bullet(s) under the existing header (do NOT add a duplicate header)
   - If it **does not exist**: append a new header block at the bottom:
     ```
     ## YYYY-MM-DD

     - ingested — `raw/<path>/<filename>` → `wiki/<subfolder>/<slug>.md` (<one-line rationale>)
     - updated — `wiki/index.md` (if index was updated)
     ```

6. **Mark the article as processed**: update the article's frontmatter `status: unprocessed` → `status: processed`
   - This is the only permitted modification to raw source files.

7. **Report** what was processed:
   - List each article processed
   - List each wiki page created or updated
   - Note any articles skipped (with reason)

## Constraints

- Dates are always ISO format `YYYY-MM-DD` — never relative
- New wiki page filenames: `<kebab-case-slug>.md` — no date prefix (date goes in log.md only)
- Exception: `portfolio/decisions/` uses date prefix: `YYYY-MM-DD-asset-action.md`
- Wiki page paths are `IncrementumOS/wiki/<subfolder>/<slug>.md` — never `IncrementumOS/wiki/wiki/...`
- Never modify raw source files except updating the `status` frontmatter field (see Step 6)
- Never invent financial data or claims not present in the source article
- If the article's topic doesn't fit any subfolder clearly, ask before proceeding
- Only append to `wiki/index.md` for new pages — existing pages already have an index entry
- Never add a duplicate `## YYYY-MM-DD` header to log.md — coalesce entries under the same date
- If no unprocessed files exist in raw/, report that clearly and stop

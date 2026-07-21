# TrueCrew Google Drive exports → AnythingLLM

## Problem
- Google Drive "TrueCrew" folder contains `.gdoc` pointer files (~178 bytes JSON, no real text).
- AnythingLLM cannot read content from `.gdoc` stubs.
- Result: cloud-mirror checks fail because there is no actual text to embed.

## Target
- Maintain a local export folder with real `.md` or `.txt` files derived from key TrueCrew Google Docs.
- Use that export folder as the AnythingLLM data source instead of the raw Drive pointer folder.

## Export workflow (manual)
1. In Google Drive (web):
   - Open `My Drive/TrueCrew`.
   - For each important TrueCrew doc:
     - Open the `.gdoc`.
     - File → Download → "Markdown (.md)" or "Plain text (.txt)".
2. Save all exports into:
   - `/Users/truecrew/Documents/TrueCrew/Exports/TrueCrew-GDrive`
3. Ensure filenames are stable and descriptive (e.g., `TrueCrew-Master-Build-Plan.md`).

## AnythingLLM datasource update
- Instead of pointing to the `.gdoc` folder:
  - Use `/Users/truecrew/Documents/TrueCrew/Exports/TrueCrew-GDrive` as the Google Drive mirror source.
- Re-run embedding in the `SaaS-Dev` workspace after new exports.

## Validation prompt impact
- Cloud-mirror prompt:
  - Once exports exist, AnythingLLM should name at least one exported file.
  - Before exports, failures on this prompt are expected (no real content).

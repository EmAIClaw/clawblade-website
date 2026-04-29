# AlbumVault

AlbumVault is a personal Netlify-hosted CD tracking app for the 243-album catalog in `/Users/ai/Downloads/cd_collection.json`.

## Local setup

```bash
npm install
npm run prepare:catalog:offline
npm run generate:encyclopedia
npm run dev
```

Use `npm run prepare:catalog` when network access is available to fetch Apple artwork and track metadata. The importer preserves previous Apple matches, so it is safe to rerun if Apple rate-limits partway through. For a gentler pass, use `APPLE_DELAY_MS=1500 npm run prepare:catalog`.

To use Google Images as a fallback for albums Apple cannot resolve, create a Google Programmable Search Engine with image search enabled and set:

```text
GOOGLE_CUSTOM_SEARCH_API_KEY=...
GOOGLE_CUSTOM_SEARCH_CX=...
```

Then rerun `npm run prepare:catalog`. Google fallback only runs for albums that still have the placeholder cover.

For a credential-free fallback, run:

```bash
npm run fill:covers
```

That searches MusicBrainz release groups and downloads curated front covers from the Cover Art Archive for albums still using the placeholder.

Run `npm run generate:encyclopedia` to refresh static artist, album, and track reference data from source-backed public metadata. The script checkpoints after each album and preserves existing track source matches unless you force a full refresh.

## Netlify

Set these environment variables in Netlify:

```text
ALBUMVAULT_PASSCODE=your-private-passcode
ALBUMVAULT_ALLOWED_ORIGIN=https://your-domain.example
```

The runtime app only calls Netlify Functions. Apple, MusicBrainz/Cover Art Archive, Google Custom Search, and Wikipedia enrichment are build/prep steps.

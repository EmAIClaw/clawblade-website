import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const encyclopediaPath = path.join(root, "src/data/encyclopedia.generated.json");
const enrichedPath = path.join(root, "src/data/enriched.json");
const outputPath = path.join(root, "src/data/encyclopedia.generated.json");

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const encyclopedia = JSON.parse(await readFile(encyclopediaPath, "utf8"));
  let enriched = { entries: {} };
  try {
    enriched = JSON.parse(await readFile(enrichedPath, "utf8"));
  } catch {
    console.log("No enriched data, skipping merge.");
    return;
  }

  const entries = { ...encyclopedia.entries };
  let merged = 0;
  
  for (const album of catalog.albums) {
    const rich = enriched.entries[album.id];
    if (!rich || rich._error) continue;
    
    const existing = entries[album.id] ?? {};

    // Replace/upgrade the entry with enriched data
    const trackGuides = (rich.trackGuides ?? []).map((g) => ({
      trackTitle: g.trackTitle,
      guide: g.guide ?? "",
      focus: "AI-enriched listening guide",
      source: null
    }));

    const themes = rich.themes?.length
      ? rich.themes
      : (existing.themes ?? []);

    const listeningNotes = [
      rich.artistContext ? `Artist context: ${rich.artistContext.slice(0, 200)}…` : "",
      rich.albumOverview ? `Album: ${rich.albumOverview.slice(0, 200)}…` : "",
      rich.didYouKnow?.length ? `Did you know: ${rich.didYouKnow.join(" | ")}` : "",
    ].filter(Boolean);

    entries[album.id] = {
      albumId: album.id,
      artistInfo: rich.artistContext ? {
        summary: rich.artistContext,
        source: {
          label: "AI Enriched",
          title: `${album.title} — AI-generated encyclopedia`,
          url: "",
          extract: rich.artistContext,
          summary: rich.artistContext.slice(0, 500),
          score: rich._scores?.overall ?? 8
        }
      } : (existing.artistInfo ?? null),
      albumInfo: rich.albumOverview ? {
        summary: [
          rich.albumOverview,
          rich.reception ? `\n\nReception: ${rich.reception}` : "",
          rich.musicalInnovation ? `\n\nInnovation: ${rich.musicalInnovation}` : "",
          rich.culturalImpact ? `\n\nImpact: ${rich.culturalImpact}` : "",
          rich.legacy ? `\n\nLegacy: ${rich.legacy}` : "",
        ].filter(Boolean).join(""),
        source: {
          label: "AI Enriched",
          title: `${album.title} — AI-generated encyclopedia`,
          url: "",
          extract: rich.albumOverview,
          summary: rich.albumOverview.slice(0, 500),
          score: rich._scores?.overall ?? 8
        }
      } : (existing.albumInfo ?? null),
      context: rich.albumOverview?.slice(0, 600) ?? existing.context ?? "",
      relevance: `AI-enriched entry. Score: ${rich._scores?.overall ?? "?"}/10 (accuracy: ${rich._scores?.accuracy ?? "?"}, interest: ${rich._scores?.interest ?? "?"}, usefulness: ${rich._scores?.usefulness ?? "?"}).`,
      listeningNotes: listeningNotes.length ? listeningNotes : (existing.listeningNotes ?? []),
      trackGuide: trackGuides.length ? trackGuides : (existing.trackGuide ?? []),
      themes,
      sources: [
        {
          label: "AI Enriched",
          title: `${album.title}`,
          url: "",
          extract: JSON.stringify(rich._scores ?? {}),
          summary: `Self-critiqued enrichment (round ${rich._scores?.critiqueRound ?? "?"})`,
          score: rich._scores?.overall ?? 8
        },
        ...(existing.sources ?? [])
      ]
    };
    merged++;
  }

  const metadata = {
    ...encyclopedia.metadata,
    generatedAt: new Date().toISOString(),
    mode: "merged-wikipedia-plus-ai-enriched",
    enrichedCount: merged,
    total: catalog.albums.length
  };

  await writeFile(outputPath, JSON.stringify({ metadata, entries }, null, 2));
  console.log(`Merged ${merged} enriched entries into encyclopedia.generated.json`);
  console.log(`Total entries: ${Object.keys(entries).length}/${catalog.albums.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

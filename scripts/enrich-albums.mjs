import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const catalogPath = path.join(root, "src/data/catalog.generated.json");
const enrichedPath = path.join(root, "src/data/enriched.json");
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ENRICH_MODEL ?? "deepseek-v4-pro:cloud";
const ALBUM_LIMIT = Number(process.env.ENRICH_LIMIT ?? "999");
const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? "3");
const TARGET_SCORE = Number(process.env.TARGET_SCORE ?? "9");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Ollama caller ───────────────────────────────────────────────

async function ollama(messages, { maxTokens = 4096, temperature = 0.7 } = {}) {
  const body = {
    model: MODEL,
    messages,
    stream: false,
    options: { temperature, num_predict: maxTokens }
  };
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.message?.content ?? "";
}

// ─── Prompt templates ─────────────────────────────────────────────

function buildEnrichmentPrompt(album) {
  const trackList = album.tracks.length
    ? album.tracks
        .map(
          (t, i) =>
            `${i + 1}. "${t.title}"${t.durationMs ? ` (${Math.round(t.durationMs / 1000)}s)` : ""}`
        )
        .join("\n")
    : "(track listing unavailable from Apple)";

  return `You are a world-class music journalist and historian. Write a deeply interesting, factually accurate encyclopedia entry for this album. Research from your training data only — do not invent. If uncertain, note the uncertainty.

ALBUM:
  Title: "${album.title}"
  Artist: "${album.artist}"
  Year: ${album.year}
  Rank in canon: #${album.rank} of 243
  Genre: ${album.genre ?? "unknown"}

TRACK LISTING:
${trackList}

Write the following sections. Be vivid, specific, and surprising. Include concrete details (studio names, producers, sessions, specific instruments, chart positions, awards, cultural moments). Each section must be substantial — at least 3-4 sentences:

1. ARTIST CONTEXT: Who is this artist at this point in their career? What led to this album? What were they reacting against or building on?

2. ALBUM OVERVIEW: The recording process, key collaborators, album concept or theme. Where was it recorded? Who produced it? Any challenges or breakthroughs during creation?

3. CRITICAL / COMMERCIAL RECEPTION: Chart performance, key awards, notable reviews (publication names and pull quotes if known), sales figures if notable.

4. MUSICAL INNOVATION: What made this album distinctive sonically? Production techniques, genre-blending, lyrical themes, structural choices that stood out.

5. CULTURAL IMPACT: How did this album influence later music or culture? Who cites it as an influence? Was it politically/socially significant?

6. LEGACY: Where does this album stand today? Re-releases, remasters, anniversaries, continued relevance.

7. LISTENING GUIDE: For 3-5 key tracks, write a focused guide note (2-3 sentences each) — what to listen for, standout moments, lyrical or musical highlights.

8. THEMES: List 4-6 thematic tags in a comma-separated line.

9. DID YOU KNOW?: 2-3 surprising, little-known facts about this album (specific and verifiable).

Format your response as valid JSON:
{
  "artistContext": "...",
  "albumOverview": "...",
  "reception": "...",
  "musicalInnovation": "...",
  "culturalImpact": "...",
  "legacy": "...",
  "trackGuides": [
    { "trackTitle": "exact title", "guide": "..." }
  ],
  "themes": ["tag1", "tag2", "..."],
  "didYouKnow": ["fact1", "fact2", "..."]
}

Respond with ONLY the JSON object, no markdown fences or commentary.`;
}

function buildCritiquePrompt(album, entry) {
  return `You are a rigorous music fact-checker and editor. Review this encyclopedia entry for accuracy, interest, and usefulness.

ALBUM: "${album.title}" by ${album.artist} (${album.year})

CURRENT ENTRY:
${JSON.stringify(entry, null, 2)}

Score this entry on three dimensions (each 0-10):
1. ACCURACY: Are the facts correct and verifiable? Any hallucinations or vagueness?
2. INTEREST: Is this engaging, vivid, and surprising? Does it teach something new?
3. USEFULNESS: Would this help someone appreciate the album more deeply? Is it practical for a listener?

Respond as valid JSON:
{
  "accuracyScore": <number>,
  "interestScore": <number>,
  "usefulnessScore": <number>,
  "overallScore": <number>,
  "critique": "<specific issues found, one per line>",
  "improvementInstructions": "<concrete steps to fix the issues>"
}

Respond with ONLY the JSON object.`;
}

function buildImprovePrompt(album, entry, critique) {
  return `You are a world-class music journalist. Improve this encyclopedia entry based on the critique below.

ALBUM: "${album.title}" by ${album.artist} (${album.year})

CURRENT ENTRY:
${JSON.stringify(entry, null, 2)}

CRITIQUE & IMPROVEMENT INSTRUCTIONS:
${critique}

Return the IMPROVED entry as valid JSON with the same structure:
{
  "artistContext": "...",
  "albumOverview": "...",
  "reception": "...",
  "musicalInnovation": "...",
  "culturalImpact": "...",
  "legacy": "...",
  "trackGuides": [
    { "trackTitle": "exact title", "guide": "..." }
  ],
  "themes": ["tag1", "tag2", "..."],
  "didYouKnow": ["fact1", "fact2", "..."]
}

Respond with ONLY the JSON object, no markdown fences.`;
}

// ─── JSON extraction (handles LLM quirks) ────────────────────────

function extractJSON(text) {
  // Remove any markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/gi, "");
  // Try to find JSON object boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

// ─── Self-critique loop ───────────────────────────────────────────

async function enrichAlbum(album, cache = new Map()) {
  const cacheKey = `enrich:${album.id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  console.log(`\n🎵 Enriching #${album.rank}: "${album.title}" by ${album.artist}`);

  // Step 1: Generate initial entry
  console.log("  → Generating initial entry...");
  const genPrompt = buildEnrichmentPrompt(album);
  const rawGen = await ollama([{ role: "user", content: genPrompt }], {
    maxTokens: 4096,
    temperature: 0.7
  });

  let entry;
  try {
    entry = extractJSON(rawGen);
  } catch {
    console.log("  ⚠ JSON parse failed on first attempt, retrying...");
    const retry = await ollama([
      { role: "user", content: genPrompt },
      { role: "assistant", content: rawGen.slice(0, 500) },
      { role: "user", content: "That wasn't valid JSON. Please output ONLY the JSON object, no other text:" }
    ], { maxTokens: 4096, temperature: 0.5 });
    try {
      entry = extractJSON(retry);
    } catch {
      console.log("  ❌ Could not parse JSON. Saving raw response.");
      entry = { raw: rawGen, artistContext: "Generation failed — JSON parse error", albumOverview: "", reception: "", musicalInnovation: "", culturalImpact: "", legacy: "", trackGuides: [], themes: [], didYouKnow: [] };
    }
  }

  // Step 2: Critique loop
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`  → Critique round ${attempt + 1}...`);
    const critiquePrompt = buildCritiquePrompt(album, entry);
    const rawCritique = await ollama([{ role: "user", content: critiquePrompt }], {
      maxTokens: 1024,
      temperature: 0.3
    });

    let critique;
    try {
      critique = extractJSON(rawCritique);
    } catch {
      console.log("  ⚠ Could not parse critique JSON.");
      continue;
    }

    const overall = typeof critique.overallScore === "number"
      ? critique.overallScore
      : Math.round((critique.accuracyScore + critique.interestScore + critique.usefulnessScore) / 3);

    console.log(
      `  📊 Scores: accuracy=${critique.accuracyScore} interest=${critique.interestScore} usefulness=${critique.usefulnessScore} overall=${overall}`
    );

    entry._scores = {
      accuracy: critique.accuracyScore,
      interest: critique.interestScore,
      usefulness: critique.usefulnessScore,
      overall,
      critiqueRound: attempt + 1
    };

    if (overall >= TARGET_SCORE) {
      console.log(`  ✅ Reached target score ${overall}/${TARGET_SCORE}`);
      break;
    }

    if (attempt < MAX_RETRIES - 1) {
      const improvCrit = (critique.critique ?? "") + "\n" + (critique.improvementInstructions ?? "");
      console.log(`  → Improving (score ${overall}, target ${TARGET_SCORE})...`);
      const improvePrompt = buildImprovePrompt(album, entry, improvCrit);
      const rawImproved = await ollama([{ role: "user", content: improvePrompt }], {
        maxTokens: 4096,
        temperature: 0.6
      });

      try {
        const improved = extractJSON(rawImproved);
        improved._scores = entry._scores;
        entry = improved;
      } catch {
        console.log("  ⚠ Could not parse improved JSON, keeping previous version.");
      }
    }
  }

  entry._enrichedAt = new Date().toISOString();
  entry._model = MODEL;

  cache.set(cacheKey, entry);
  return entry;
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const albums = catalog.albums;

  let enriched = { entries: {} };
  try {
    enriched = JSON.parse(await readFile(enrichedPath, "utf8"));
    console.log(`Loaded existing enriched data with ${Object.keys(enriched.entries).length} entries.`);
  } catch {
    console.log("No existing enriched data, starting fresh.");
  }

  const cache = new Map();
  for (const [id, entry] of Object.entries(enriched.entries)) {
    cache.set(`enrich:${id}`, entry);
  }

  const toProcess = albums.filter((a) => !cache.has(`enrich:${a.id}`)).slice(0, ALBUM_LIMIT);

  console.log(`${toProcess.length} albums to enrich (limit: ${ALBUM_LIMIT}, model: ${MODEL})`);

  let done = 0;
  for (const album of toProcess) {
    try {
      const entry = await enrichAlbum(album, cache);
      enriched.entries[album.id] = entry;

      // Checkpoint after each album
      enriched.metadata = {
        generatedAt: new Date().toISOString(),
        model: MODEL,
        totalEnriched: Object.keys(enriched.entries).length,
        targetTotal: albums.length
      };

      await writeFile(enrichedPath, JSON.stringify(enriched, null, 2));
      done++;
      console.log(`  💾 Saved (${done}/${toProcess.length})`);

      // Brief cooldown between albums
      await sleep(2000);
    } catch (error) {
      console.error(`  ❌ Failed #${album.rank} "${album.title}": ${error.message}`);
      // Save error placeholder
      enriched.entries[album.id] = {
        artistContext: `Enrichment failed: ${error.message}`,
        albumOverview: "",
        reception: "",
        musicalInnovation: "",
        culturalImpact: "",
        legacy: "",
        trackGuides: [],
        themes: [],
        didYouKnow: [],
        _error: error.message,
        _enrichedAt: new Date().toISOString()
      };
      await writeFile(enrichedPath, JSON.stringify(enriched, null, 2));
    }
  }

  console.log(`\n🏁 Done. Enriched ${done} albums. Total in cache: ${Object.keys(enriched.entries).length}/${albums.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

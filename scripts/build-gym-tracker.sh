#!/bin/bash
# Post-build: Build gym tracker and merge into AlbumVault dist/
# Run by Netlify after npm run build
set -e

echo "=== Building Gym Tracker for /gym/ subfolder ==="

GYM_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/EmAIClaw/gym-tracker.git "$GYM_DIR" 2>/dev/null || true

# If clone fails (private repo), skip silently
if [ ! -f "$GYM_DIR/package.json" ]; then
  echo "⚠️  Gym tracker repo not available, skipping merge."
  exit 0
fi

cd "$GYM_DIR"
npm install --prefer-offline 2>&1 | tail -3
npx expo export --platform web 2>&1 | tail -3

# Patch paths for /gym/ subfolder
find dist -type f \( -name '*.js' -o -name '*.html' \) -exec sed -i 's|/_expo/|/gym/_expo/|g' {} +

# Restructure into /gym/ subfolder
mkdir -p dist/gym
mv dist/index.html dist/gym/
mv dist/_expo dist/gym/ 2>/dev/null || true
mv dist/assets dist/gym/ 2>/dev/null || true
mv dist/metadata.json dist/gym/ 2>/dev/null || true

# Find the real dist target (the albumvault build output)
# Netlify sets PUBLISH_DIR or we use the repo root's dist/
TARGET_DIST="${NETLIFY_OUTPUT_DIR:-dist}"
if [ ! -d "$TARGET_DIST" ]; then
  # Walk up to find the albumvault dist
  TARGET_DIST="$(dirname "$0")/dist"
fi

echo "=== Merging gym tracker into $TARGET_DIST ==="
cp -r dist/gym "$TARGET_DIST/gym"

echo "✅ Gym tracker merged at $TARGET_DIST/gym/"
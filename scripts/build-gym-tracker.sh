#!/bin/bash
# Build gym tracker and merge into AlbumVault dist/
# Works both locally and on Netlify build servers
set -e

echo "=== Building Gym Tracker for /gym/ subfolder ==="

GYM_DIR=""
BUILT=false

# Try local path first
if [ -f "$HOME/.openclaw/workspace/projects/gym-tracker/package.json" ]; then
  GYM_DIR="$HOME/.openclaw/workspace/projects/gym-tracker"
  echo "Using local gym-tracker at $GYM_DIR"
  BUILT=true
fi

# Try sibling directory
if [ -z "$GYM_DIR" ] && [ -f "../gym-tracker/package.json" ]; then
  GYM_DIR="../gym-tracker"
  echo "Using sibling gym-tracker at $GYM_DIR"
  BUILT=true
fi

# Try cloning from GitHub (works on Netlify build servers if repo is accessible)
if [ -z "$GYM_DIR" ]; then
  GYM_DIR=$(mktemp -d)
  echo "Cloning gym-tracker from GitHub..."
  if git clone --depth 1 https://github.com/EmAIClaw/gym-tracker.git "$GYM_DIR" 2>/dev/null; then
    BUILT=true
  else
    echo "⚠️  Failed to clone gym-tracker repo, skipping."
    rm -rf "$GYM_DIR"
    exit 0
  fi
fi

cd "$GYM_DIR"
echo "Installing dependencies..."
npm install --prefer-offline 2>&1 | tail -3

echo "Building with expo export..."
npx expo export --platform web 2>&1 | tail -5

echo "Patching asset paths for /gym/ subfolder..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  find dist -type f \( -name '*.js' -o -name '*.html' \) -exec sed -i '' 's|/_expo/|/gym/_expo/|g' {} +
else
  find dist -type f \( -name '*.js' -o -name '*.html' \) -exec sed -i 's|/_expo/|/gym/_expo/|g' {} +
fi

# Restructure into /gym/ subfolder
echo "Restructuring dist into /gym/ subfolder..."
mkdir -p dist/gym
mv dist/index.html dist/gym/ 2>/dev/null || true
mv dist/_expo dist/gym/ 2>/dev/null || true
mv dist/assets dist/gym/ 2>/dev/null || true
mv dist/metadata.json dist/gym/ 2>/dev/null || true

# Merge into albumvault dist/
TARGET_DIST="${NETLIFY_OUTPUT_DIR:-dist}"
if [ ! -d "$TARGET_DIST" ]; then
  TARGET_DIST="$(dirname "$(dirname "$0")")/dist"
fi

echo "=== Merging gym tracker into $TARGET_DIST ==="
rm -rf "$TARGET_DIST/gym"
cp -r dist/gym "$TARGET_DIST/gym"

echo "✅ Gym tracker merged at $TARGET_DIST/gym/"

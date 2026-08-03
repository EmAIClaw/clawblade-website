#!/bin/bash
# Build gym tracker and merge into AlbumVault dist/
# Works both locally and on Netlify build servers
set -e

echo "=== Building Gym Tracker for /gym/ subfolder ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
GYM_DIR=""
BUILT=false

# Try Hermes workspace first
if [ -f "$HOME/.hermes/workspace/projects/gym-tracker/package.json" ]; then
  GYM_DIR="$HOME/.hermes/workspace/projects/gym-tracker"
  echo "Using Hermes workspace gym-tracker at $GYM_DIR"
  BUILT=true
fi

# Fallback: clone from GitHub (works on Netlify build servers if repo is accessible)
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
npm ci --prefer-offline 2>&1 | tail -3

echo "Building with expo export..."
npx expo export --platform web 2>&1 | tail -5

echo "Patching asset paths for /gym/ subfolder..."
# Expo emits absolute paths for the JS bundle and package assets.
# Both must be rooted under /gym/ when AlbumVault serves this app as a subfolder.
if [[ "$OSTYPE" == "darwin"* ]]; then
  find dist -type f \( -name '*.js' -o -name '*.html' \) -exec sed -i '' \
    -e 's|/_expo/|/gym/_expo/|g' \
    -e 's|/assets/node_modules/|/gym/assets/node_modules/|g' {} +
else
  find dist -type f \( -name '*.js' -o -name '*.html' \) -exec sed -i \
    -e 's|/_expo/|/gym/_expo/|g' \
    -e 's|/assets/node_modules/|/gym/assets/node_modules/|g' {} +
fi

# Restructure into /gym/ subfolder
echo "Restructuring dist into /gym/ subfolder..."
mkdir -p dist/gym
mv dist/index.html dist/gym/ 2>/dev/null || true
mv dist/_expo dist/gym/ 2>/dev/null || true
mv dist/assets dist/gym/ 2>/dev/null || true
mv dist/metadata.json dist/gym/ 2>/dev/null || true

# Merge into albumvault dist/
TARGET_DIST="${NETLIFY_OUTPUT_DIR:-$PROJECT_DIR/dist}"

echo "=== Merging gym tracker into $TARGET_DIST ==="
rm -rf "$TARGET_DIST/gym"
cp -r dist/gym "$TARGET_DIST/gym"

echo "✅ Gym tracker merged at $TARGET_DIST/gym/"

#!/bin/bash
# Build both AlbumVault and Gym Tracker, merge into one dist/
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ALBUM_DIR="$SCRIPT_DIR"
GYM_DIR="$(dirname "$SCRIPT_DIR")/gym-tracker"

echo "=== Building AlbumVault ==="
cd "$ALBUM_DIR"
npm run build

echo ""
echo "=== Building Gym Tracker (with /gym/ prefix) ==="
cd "$GYM_DIR"
bash build-subfolder.sh

echo ""
echo "=== Merging into AlbumVault dist/ ==="
# Remove old gym folder if exists
rm -rf "$ALBUM_DIR/dist/gym"
cp -r "$GYM_DIR/dist/gym" "$ALBUM_DIR/dist/gym"

echo ""
echo "✅ Combined dist/ ready at: $ALBUM_DIR/dist/"
echo "   /            → AlbumVault"
echo "   /gym/        → Gym Tracker"
echo ""
echo "To deploy: cd $ALBUM_DIR && git add -A && git commit -m 'deploy: albumvault + gym tracker' && git push"
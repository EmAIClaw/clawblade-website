#!/usr/bin/env bash
set -euo pipefail

# Build and deploy the Gym Tracker the way Netlify is configured to work:
# local machine -> GitHub -> Netlify Git deploy.
#
# This intentionally does NOT call `netlify deploy`. Netlify publishes after
# the clawblade-website repo receives the commit that updates dist-gym/.

HOST_REPO="${HOST_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
GYM_REPO="${GYM_REPO:-/Users/ai/.hermes/workspace/projects/gym-tracker}"
SOURCE_MESSAGE="${SOURCE_MESSAGE:-fix: update gym tracker source}"
HOST_MESSAGE="${HOST_MESSAGE:-deploy: update gym tracker bundle}"

require_clean_except() {
  local repo="$1"
  shift
  local allowed_regex="$1"
  local dirty
  dirty=$(git -C "$repo" status --porcelain)
  if [[ -z "$dirty" ]]; then
    return 0
  fi
  local unexpected
  unexpected=$(printf '%s\n' "$dirty" | awk '{print substr($0,4)}' | grep -Ev "$allowed_regex" || true)
  if [[ -n "$unexpected" ]]; then
    echo "Refusing to continue: unexpected uncommitted changes in $repo:" >&2
    printf '%s\n' "$unexpected" >&2
    echo "Commit/stash them first, or run from a clean worktree." >&2
    exit 1
  fi
}

commit_if_needed() {
  local repo="$1"
  local message="$2"
  shift 2
  git -C "$repo" add "$@"
  if git -C "$repo" diff --cached --quiet; then
    echo "No commit needed in $repo"
  else
    git -C "$repo" commit -m "$message"
  fi
}

echo "==> Verifying Gym source repo"
git -C "$GYM_REPO" remote get-url origin >/dev/null
git -C "$GYM_REPO" ls-remote origin refs/heads/main >/dev/null
npm --prefix "$GYM_REPO" run typecheck -- --pretty false

# Commit and push any source edits first so GitHub has the human-readable app source.
commit_if_needed "$GYM_REPO" "$SOURCE_MESSAGE" App.tsx app.json package.json package-lock.json src

git -C "$GYM_REPO" push origin "$(git -C "$GYM_REPO" branch --show-current)"

echo "==> Building host site and /gym bundle"
cd "$HOST_REPO"
npm run test:security
npm run build
bash scripts/build-gym-tracker.sh
rm -rf dist-gym
cp -R dist/gym dist-gym
# dist/ is a local build output for verification. Only dist-gym/ is tracked as
# the Git-backed fallback bundle that Netlify copies during its build.
git restore dist/gym 2>/dev/null || true

python3 - <<'PY'
from pathlib import Path
html = Path('dist-gym/index.html').read_text()
assert '/gym/_expo/' in html, 'dist-gym index.html does not point at /gym/_expo/'
app = next(Path('dist-gym/_expo/static/js/web').glob('AppEntry-*.js'))
s = app.read_text(errors='ignore')
assert '/gym/assets/node_modules/@expo/vector-icons/' in s, 'Ionicons font path is not rooted at /gym/'
worker = next(Path('dist-gym/_expo/static/js/web').glob('worker-*.js'))
ws = worker.read_text(errors='ignore')
assert '/gym/assets/node_modules/expo-sqlite/' in ws, 'SQLite WASM path is not rooted at /gym/'
print('bundle invariants passed')
PY

# Do not accidentally sweep unrelated edits into the deployment commit.
require_clean_except "$HOST_REPO" '^(dist-gym/.*|netlify\.toml|netlify/functions/gym-state\.ts|scripts/(build-gym-tracker\.sh|deploy-gym-via-github\.sh|test-security\.mjs)|package\.json)$'
commit_if_needed "$HOST_REPO" "$HOST_MESSAGE" dist-gym netlify.toml netlify/functions/gym-state.ts scripts/build-gym-tracker.sh scripts/deploy-gym-via-github.sh scripts/test-security.mjs package.json

git -C "$HOST_REPO" push origin "$(git -C "$HOST_REPO" branch --show-current)"

echo "==> Done. Netlify should now deploy from the GitHub commit."
echo "Gym source HEAD: $(git -C "$GYM_REPO" rev-parse HEAD)"
echo "Host deploy HEAD: $(git -C "$HOST_REPO" rev-parse HEAD)"

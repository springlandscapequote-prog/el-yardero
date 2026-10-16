#!/bin/sh
# One-step release: stamp the version, commit everything, push to main.
# Usage: ./release.sh "what changed"
# (If you forget, the GitHub Action .github/workflows/stamp-version.yml stamps it for you after you push.)
set -e
cd "$(dirname "$0")"
sh tools/stamp.sh
git add -A
git commit -m "${1:-Update}" || echo "nothing new to commit"
git push origin main

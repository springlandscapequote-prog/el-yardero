#!/bin/sh
# Stamps the site with a version that changes whenever any app file changes.
# Writes: version.js (APP_VERSION baked into the page), version.json (what the page compares against),
# and the ?v= on the <script>/<link> tags in index.html. Safe to run any number of times (same files -> same stamp).
set -e
cd "$(dirname "$0")/.."
FILES=$(git ls-files | grep -Ev '^(version\.js|version\.json|index\.html|README\.md|LICENSES\.md|UPDATE\.md|BUGS_AVOIDED\.md|BRAIN_SYNC\.md|\.gitignore|release\.sh|tools/|tests/|shots/|\.github/)' | sort)
H=$( ( sed 's/?v=[A-Za-z0-9._-]*/?v=X/g' index.html; for f in $FILES; do printf '%s\n' "$f"; cat "$f"; done ) | sha256sum | cut -c1-10 )
printf "var APP_VERSION='%s';\n" "$H" > version.js
printf '{"v":"%s"}\n' "$H" > version.json
sed -i "s/\(\(src\|href\)=\"[A-Za-z0-9._\/-]*\.\(js\|css\)\)?v=[A-Za-z0-9._-]*\"/\1?v=$H\"/g" index.html
echo "stamped version $H"

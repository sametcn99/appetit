#!/usr/bin/env bash
set -euo pipefail

JSON_FILE="apps.json"

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: brew install jq"
  exit 1
fi

tmp=$(mktemp)
cp "$JSON_FILE" "$tmp"

len=$(jq '.apps | length' "$tmp")

for ((i = 0; i < len; i++)); do
  github=$(jq -r ".apps[$i].github" "$tmp")
  repo=${github#https://github.com/}
  name=$(jq -r ".apps[$i].name" "$tmp")

  echo -n "Fetching $name ($repo)... "

  response=$(curl -sf "https://api.github.com/repos/$repo" \
    ${GITHUB_TOKEN:+-H "Authorization: token $GITHUB_TOKEN"}) || {
    echo "FAILED (rate limited or not found)"
    continue
  }

  stars=$(echo "$response" | jq '.stargazers_count')
  forks=$(echo "$response" | jq '.forks_count')

  echo "★ $stars  ⑂ $forks"

  tmp2=$(mktemp)
  jq ".apps[$i].stars = $stars | .apps[$i].forks = $forks" "$tmp" > "$tmp2"
  mv "$tmp2" "$tmp"
done

mv "$tmp" "$JSON_FILE"
echo "Done. Updated $JSON_FILE"

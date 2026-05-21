#!/usr/bin/env bash
set -euo pipefail

version="${1:?version required}"
major="$(printf '%s' "${version}" | cut -d. -f1 | tr -d 'v')"
minor="$(printf '%s' "${version}" | cut -d. -f2)"

git tag --force "v${major}" "${version}"
git tag --force "v${major}.${minor}" "${version}"
git push --force origin "v${major}" "v${major}.${minor}"

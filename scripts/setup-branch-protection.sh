#!/usr/bin/env bash
set -euo pipefail

repo="${1:-oaslananka/boardreadyops}"
branch="${2:-main}"

export MSYS2_ARG_CONV_EXCL="*"
export MSYS_NO_PATHCONV=1
if command -v gh.exe >/dev/null 2>&1; then
  gh_bin="gh.exe"
else
  gh_bin="gh"
fi

gh_input_path() {
  local path="$1"
  if [[ "${gh_bin}" == "gh.exe" ]] && command -v cygpath >/dev/null 2>&1; then
    cygpath -w "${path}"
  elif [[ "${gh_bin}" == "gh.exe" ]] && command -v wslpath >/dev/null 2>&1; then
    wslpath -w "${path}"
  else
    printf '%s' "${path}"
  fi
}

payload="$(mktemp)"
cat >"${payload}" <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci / lint",
      "ci / typecheck",
      "ci / test-unit (ubuntu-latest, Node 22)",
      "ci / test-unit (ubuntu-latest, Node 24)",
      "ci / test-unit (windows-2025-vs2026, Node 22)",
      "ci / test-unit (windows-2025-vs2026, Node 24)",
      "ci / test-unit (macos-latest, Node 22)",
      "ci / test-unit (macos-latest, Node 24)",
      "ci / test-int (KiCad 10.0, Node 24)",
      "ci / cross-platform-paths (ubuntu-latest)",
      "ci / cross-platform-paths (macos-latest)",
      "ci / cross-platform-paths (windows-2025-vs2026)",
      "ci / test-action",
      "ci / accessibility",
      "ci / build",
      "ci / verify-dist",
      "ci / coverage-gate",
      "ci / mutation",
      "ci / security",
      "gitleaks",
      "zizmor",
      "security / dependency-review",
      "security / codeql",
      "security / osv",
      "security / gitleaks",
      "security / sbom",
      "CodeQL"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
owner_type="$("${gh_bin}" api "repos/${repo}" --jq ".owner.type" 2>/dev/null || printf 'User')"
if [[ "${owner_type}" == "Organization" ]]; then
  python - "${payload}" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as handle:
    payload = json.load(handle)
payload["required_pull_request_reviews"]["bypass_pull_request_allowances"] = {
    "apps": ["release-please", "renovate", "github-actions"]
}
with open(path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY
fi
payload_input="$(gh_input_path "${payload}")"

if ! "${gh_bin}" api --method PUT "repos/${repo}/branches/${branch}/protection" --input "${payload_input}"; then
  python - "${payload}" <<'PY'
import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as handle:
    payload = json.load(handle)
payload["required_pull_request_reviews"].pop("bypass_pull_request_allowances", None)
with open(path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle)
PY
  "${gh_bin}" api --method PUT "repos/${repo}/branches/${branch}/protection" --input "${payload_input}"
fi

"${gh_bin}" api --method POST "repos/${repo}/branches/${branch}/protection/required_signatures" >/dev/null

"${gh_bin}" api --method PATCH "repos/${repo}" \
  --field delete_branch_on_merge=true \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=false

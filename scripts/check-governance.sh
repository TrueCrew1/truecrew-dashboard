#!/usr/bin/env bash

set -u
set -o pipefail

TARGET_BRANCHES=("main" "feat/chief-v1-standup" "feat/chief-governed-loops")
SKIP_CHECKS=0

for arg in "$@"; do
  case "$arg" in
    --skip-checks)
      SKIP_CHECKS=1
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: bash scripts/check-governance.sh [--skip-checks]

Runs a read-only governance readiness pass:
1) Branch status for key branches
2) npm lint/build/test
3) Governed-loop feature coverage by file/content presence

Options:
  --skip-checks   Skip npm lint/build/test (status + coverage only)
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 1

CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || echo detached)"

branch_exists_local() {
  git show-ref --verify --quiet "refs/heads/$1"
}

branch_exists_remote() {
  git show-ref --verify --quiet "refs/remotes/origin/$1"
}

print_branch_row() {
  local branch="$1"
  local local_state="no"
  local remote_state="no"
  local ahead="n/a"
  local behind="n/a"

  if branch_exists_local "$branch"; then
    local_state="yes"
  fi
  if branch_exists_remote "$branch"; then
    remote_state="yes"
  fi

  if branch_exists_local main && branch_exists_local "$branch"; then
    local counts
    counts="$(git rev-list --left-right --count "main...$branch" 2>/dev/null || true)"
    if [[ -n "$counts" ]]; then
      read -r behind ahead <<< "$counts"
    fi
  fi

  printf "%-28s | local:%-3s remote:%-3s | ahead:%-5s behind:%-5s\n" \
    "$branch" "$local_state" "$remote_state" "$ahead" "$behind"
}

has_file() {
  [[ -f "$1" ]]
}

has_literal() {
  git grep -q --fixed-strings -- "$1" -- . 2>/dev/null
}

yes_no() {
  if "$@"; then
    echo "yes"
  else
    echo "no"
  fi
}

echo "== Branch status =="
echo "repo:    $REPO_ROOT"
echo "current: $CURRENT_BRANCH"
echo
for branch in "${TARGET_BRANCHES[@]}"; do
  print_branch_row "$branch"
done

echo
echo "== Lint/build/test results =="

overall=0

run_check() {
  local label="$1"
  shift
  if [[ "$SKIP_CHECKS" -eq 1 ]]; then
    printf "[SKIP] %s\n" "$label"
    return
  fi

  printf "[RUN ] %s\n" "$label"
  if "$@"; then
    printf "[PASS] %s\n" "$label"
  else
    printf "[FAIL] %s\n" "$label"
    overall=1
  fi
  echo
}

run_check "npm run lint" npm run lint
run_check "npm run build" npm run build
run_check "npm test" npm test

echo "== Governed-loop feature coverage =="
printf "%-58s | %s\n" "feature" "present"
printf "%-58s-+-%s\n" "$(printf '%.0s-' {1..58})" "$(printf '%.0s-' {1..7})"

# Governed research missions (named ids from request)
printf "%-58s | %s\n" \
  "research mission id: research:project-summary-handoff" \
  "$(yes_no has_literal "research:project-summary-handoff")"
printf "%-58s | %s\n" \
  "research mission id: research:monitor-incident-postmortem" \
  "$(yes_no has_literal "research:monitor-incident-postmortem")"

# Approval activity + execution feedback + result links
printf "%-58s | %s\n" \
  "approval activity card (src/components/chief/ApprovalActivityCard.tsx)" \
  "$(yes_no has_file "src/components/chief/ApprovalActivityCard.tsx")"
printf "%-58s | %s\n" \
  "approval execution feedback helper (approvalExecutionFeedback.ts)" \
  "$(yes_no has_file "src/components/chief/approvalExecutionFeedback.ts")"
printf "%-58s | %s\n" \
  "approval result links helper (approvalResultLinks.ts)" \
  "$(yes_no has_file "src/components/chief/approvalResultLinks.ts")"

# Monitor platform approval + situation brief
printf "%-58s | %s\n" \
  "monitor platform card (src/components/monitor/PlatformHealthCard.tsx)" \
  "$(yes_no has_file "src/components/monitor/PlatformHealthCard.tsx")"
printf "%-58s | %s\n" \
  "monitor guidance panel (src/components/monitor/MonitorGuidancePanel.tsx)" \
  "$(yes_no has_file "src/components/monitor/MonitorGuidancePanel.tsx")"
printf "%-58s | %s\n" \
  "chief situation brief (src/components/chief/ChiefSituationBrief.tsx)" \
  "$(yes_no has_file "src/components/chief/ChiefSituationBrief.tsx")"

# Agent mission/status surfaces
printf "%-58s | %s\n" \
  "AgentMissionsCard component (any path)" \
  "$(yes_no has_literal "AgentMissionsCard")"
printf "%-58s | %s\n" \
  "AgentStatusStrip component (any path)" \
  "$(yes_no has_literal "AgentStatusStrip")"

# Slack wiring
printf "%-58s | %s\n" \
  "SLACK_WEBHOOK_URL gating" \
  "$(yes_no has_literal "SLACK_WEBHOOK_URL")"
printf "%-58s | %s\n" \
  "governedLoopSlack wiring" \
  "$(yes_no has_literal "governedLoopSlack")"

if [[ "$overall" -eq 0 ]]; then
  echo
  echo "Governance check completed."
else
  echo
  echo "Governance check completed with failures."
fi

exit "$overall"

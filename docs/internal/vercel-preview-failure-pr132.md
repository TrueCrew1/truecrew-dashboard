# Vercel Preview failure diagnosis — PR #132

## What we verified

- Failing deployment commit: `f165cd01996510b0bdac7f963e9c9f7f2a9378ee`
- That commit is docs-only (`README.md`, `docs/security/PUBLIC_LAUNCH_CHECKLIST.md`, `docs/security/PUBLIC_REPO_READINESS_REVIEW.md`)
- Repo build succeeds locally:
  - `npm ci` ✅
  - `npm run build` ✅

## Conclusion

No repo code/config bug was found that explains a Preview **build** failure on that docs-only commit.
Most likely root cause is Vercel project/environment/integration state, not the PR diff.

## Vercel dashboard checks (Preview scope)

1. **Project → Settings → Environment Variables**
   - Confirm these exist and are scoped to **Preview**:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `VITE_USE_LIVE_API` (`true`)
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `INTERNAL_API_SECRET`
     - `VITE_INTERNAL_KEY` (must exactly match `INTERNAL_API_SECRET`)
2. **Project → Settings → Git**
   - Confirm Git integration is healthy for `TrueCrew1/truecrew-dashboard`
   - Confirm Preview deployments are enabled for PR branches
   - Confirm no ignored-build-step rule is blocking expected behavior
3. **Project → Settings → General**
   - Confirm the correct project is linked to this repository
   - Confirm no account/team-level suspension, spend limit, or quota issue
4. **Deployments → failed Preview deployment**
   - Open full build logs and identify the first hard failure line
   - If logs mention missing env vars, re-save env vars and redeploy
   - If logs mention platform/quota limits, resolve in account/team settings

## Why this is likely external to the PR

- `vercel.json` build command is stable: `npm run build`
- Current source has no build-time env assertions that should fail from missing env vars
- Missing env vars in this repo mostly cause runtime API/auth behavior changes, not frontend build failure

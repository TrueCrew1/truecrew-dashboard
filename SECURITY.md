# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in this project, please report it
privately — do not open a public GitHub issue.

Email **contact@truecrewllc.com** with:

- A description of the issue and its potential impact
- Steps to reproduce (or a proof of concept, if available)
- Any relevant logs, URLs, or affected component

We will acknowledge reports as soon as possible and follow up with next
steps. Please give us a reasonable amount of time to address an issue
before disclosing it elsewhere.

## Scope

This policy covers the **production deployment** of this application (the
Vercel-hosted app and its Supabase backend, as configured in this
repository's `main` branch). It does not cover:

- Forks of this repository run by third parties
- Local development environments or preview deployments not controlled by
  True Crew LLC
- Third-party services this project integrates with (report those directly
  to the respective vendor)

## Untrusted contributions

This is a closed repository — see [CONTRIBUTING.md](CONTRIBUTING.md). We do
not accept unsolicited external pull requests, and we do not run arbitrary
code from untrusted PRs against production systems, secrets, or credentials.
Any external PR is reviewed manually before any CI step that could execute
its code runs against protected resources.

## Supported versions

Only the code currently deployed to production (`main`) is supported with
security fixes. There are no maintained older versions.

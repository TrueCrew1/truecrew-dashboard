# Continue + Ollama config (example)

Minimal, local-only reference slice — matches the Ollama-backed roles actually in
use in `~/.continue/config.yaml`. The real local config also layers in a
`qwen2.5-coder:7b` fast-chat model, a `llama3.1:8b` tool-use chat model, and several
cloud fallback models (Azure/Mistral) with API keys — those are out of scope for
this reference and are not reproduced here since the config file itself is not
checked into the repo.

```yaml
version: v1

models:
  - name: qwen2.5-coder-14b-local
    provider: ollama
    model: qwen2.5-coder:14b
    apiBase: http://127.0.0.1:11434
    default: true

tabAutocompleteModel:
  name: qwen2.5-coder-1.5b-autocomplete
  provider: ollama
  model: qwen2.5-coder:1.5b-base
  apiBase: http://127.0.0.1:11434

embeddings:
  - name: nomic-embed-local
    provider: ollama
    model: nomic-embed-text:latest
    apiBase: http://127.0.0.1:11434
    default: true

allowAnonymousTelemetry: false
```

# Da usare con "source" negli step delle action che parlano con il pannello.
# Imposta PANNELLO_INDIRIZZO (variabile del repo PANNELLO_URL, altrimenti *.workers.dev chiesto a Cloudflare)
# e PANNELLO_TOKEN (token OIDC di GitHub con audience "hl-pannello": il job deve avere id-token: write).
# Se manca qualcosa lascia vuota la variabile e scrive perché.
PANNELLO_INDIRIZZO=$(printf %s "${PANNELLO:-}" | tr -d '[:space:]')
if [ -z "$PANNELLO_INDIRIZZO" ] && [ -n "${CF_TOKEN:-}" ] && [ -n "${CF_ACCOUNT:-}" ]; then
  sotto=$(curl -sS -H "Authorization: Bearer $(printf %s "$CF_TOKEN" | tr -d '[:space:]')" \
    "https://api.cloudflare.com/client/v4/accounts/$(printf %s "$CF_ACCOUNT" | tr -d '[:space:]')/workers/subdomain" | jq -r '.result.subdomain // empty')
  [ -n "$sotto" ] && PANNELLO_INDIRIZZO="https://hl-pannello.$sotto.workers.dev"
fi
PANNELLO_INDIRIZZO=${PANNELLO_INDIRIZZO%/}
[ -n "$PANNELLO_INDIRIZZO" ] || echo "::notice::Nessun indirizzo del pannello (variabile PANNELLO_URL o segreti Cloudflare)"
PANNELLO_TOKEN=""
if [ -n "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" ]; then
  PANNELLO_TOKEN=$(curl -sS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=hl-pannello" | jq -r '.value // empty')
else
  echo "::warning::Manca permissions id-token: write: il pannello non riconoscerebbe questa Action"
fi

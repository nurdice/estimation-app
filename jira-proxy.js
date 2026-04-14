/**
 * Jira CORS Proxy — Cloudflare Worker
 *
 * SETUP (one-time, ~2 minutes):
 *  1. Go to https://dash.cloudflare.com → Workers & Pages → Create → "Hello World"
 *  2. Replace the default script with this file.
 *  3. Add two secrets via Settings → Variables → Secret variables:
 *       JIRA_EMAIL   your Atlassian account email
 *       JIRA_TOKEN   an API token from https://id.atlassian.com/manage-profile/security/api-tokens
 *  4. Deploy. Copy the worker URL (e.g. https://jira-proxy.yourname.workers.dev).
 *  5. Paste that URL into the Jira panel inside the Estimation App app.
 *
 * The worker only proxies requests to *.atlassian.net/rest/api/ paths.
 * Your credentials never leave Cloudflare's servers.
 */
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const allowedMethods = new Set(['GET', 'PUT', 'PATCH', 'POST']);
    if (!allowedMethods.has(request.method)) {
      return new Response('Method not allowed', { status: 405 });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');

    // Strict allowlist: Jira Cloud REST API + attachment content
    const allowed = /^https:\/\/[^/]+\.atlassian\.net\/rest\/api\//.test(target)
                  || /^https:\/\/[^/]+\.atlassian\.net\/rest\/api\/3\/attachment\/content\//.test(target);
    if (!target || !allowed) {
      return new Response('Invalid or disallowed URL', { status: 400 });
    }

    if (!env.JIRA_EMAIL || !env.JIRA_TOKEN) {
      return new Response('Proxy not configured — set JIRA_EMAIL and JIRA_TOKEN secrets', { status: 503 });
    }

    const outboundHeaders = {
        Authorization: 'Basic ' + btoa(env.JIRA_EMAIL + ':' + env.JIRA_TOKEN),
        Accept: 'application/json, image/*, */*',
      };
    const requestContentType = request.headers.get('content-type');
    if (requestContentType) outboundHeaders['Content-Type'] = requestContentType;

    const upstream = await fetch(target, {
      method: request.method,
      headers: outboundHeaders,
      body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    });

    // Jira attachment endpoints return 302 → signed CDN URL.
    // In CF Workers, opaque redirect responses don't expose the location header,
    // so we extract it from the raw response headers via the Headers iterator.
    if (upstream.status >= 301 && upstream.status <= 308) {
      let location = null;
      for (const [k, v] of upstream.headers.entries()) {
        if (k.toLowerCase() === 'location') { location = v; break; }
      }
      if (location) {
        // Forward the redirect to the browser — <img> will follow it without auth.
        return new Response(null, {
          status: 302,
          headers: { 'Location': location, ...corsHeaders() },
        });
      }
    }

    // Non-redirect response (JSON, direct binary, errors).
    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': contentType, ...corsHeaders() },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

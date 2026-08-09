const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const HOSTED_MARKERS = ['VERCEL', 'NETLIFY', 'CF_PAGES', 'AWS_LAMBDA_FUNCTION_NAME', 'K_SERVICE'];

export function isTrustedLocalCodexRequest(request: Request): boolean {
  if (process.env.JARVIS_CODEX_SUBSCRIPTION_ENABLED === 'false') return false;
  if (HOSTED_MARKERS.some((key) => Boolean(process.env[key]))) return false;

  const url = new URL(request.url);
  const hostHeader = request.headers.get('host') ?? url.host;
  const hostname = hostHeader.startsWith('[')
    ? hostHeader.slice(0, hostHeader.indexOf(']') + 1)
    : hostHeader.split(':')[0];
  if (!LOOPBACK_HOSTS.has(hostname.toLowerCase())) return false;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map((hop) => hop.trim().replace(/^\[|\]$/g, ''));
    if (hops.some((hop) => hop && !LOOPBACK_HOSTS.has(hop.toLowerCase()))) return false;
  }
  return true;
}

// Validate public HTTPS URL
function validatePublicHttpsUrl(value) {
  if (typeof value !== "string" || value.length > 2048) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname
  ) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and local network domains
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return null;
  }

  // Block ALL direct IPv4 and IPv6 addresses
  if (net.isIP(hostname) !== 0) {
    return null;
  }

  // Block internal and reserved hostnames
  if (
    hostname === "metadata.google.internal" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid")
  ) {
    return null;
  }

  return parsed;
}

export function isValidBucketName(name: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(name) && !name.includes('..');
}

// Regions aren't checked against a fixed list: SigV4 only embeds the value in the
// credential scope, and providers like Garage or Ceph use their own names ("garage").
export function isValidRegion(region: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(region);
}

export function isBucketAllowed(activeBucket: string | null, requested: string): boolean {
  if (!activeBucket) return true;
  return activeBucket === requested;
}

export function env(key: string, defaultValue?: string): string {
  return process.env[key] ?? defaultValue ?? '';
}

export function envBool(key: string, defaultValue = false): boolean {
  const val = process.env[key]?.toLowerCase();
  return val === 'true' || val === '1' ? true : defaultValue;
}

export function envNum(key: string, defaultValue = 0): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultValue;
}

export function envArray(key: string, separator = ','): string[] {
  const val = process.env[key];
  return val ? val.split(separator).map((v) => v.trim()) : [];
}

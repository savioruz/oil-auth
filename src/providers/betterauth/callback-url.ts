export type CallbackUrlRewriteReason =
  | 'no-default'
  | 'caller-provided'
  | 'relative-replaced'
  | 'missing-replaced';

export interface CallbackUrlRewriteResult {
  url: string;
  rewritten: boolean;
  reason: CallbackUrlRewriteReason;
}

export function rewriteCallbackUrl(
  emailUrl: string,
  defaultCallbackUrl: string | undefined
): CallbackUrlRewriteResult {
  if (!defaultCallbackUrl) {
    return { url: emailUrl, rewritten: false, reason: 'no-default' };
  }

  const parsed = new URL(emailUrl);
  const current = parsed.searchParams.get('callbackURL');

  if (current && /^https?:\/\//.test(current)) {
    return { url: emailUrl, rewritten: false, reason: 'caller-provided' };
  }

  parsed.searchParams.set('callbackURL', defaultCallbackUrl);

  const reason: CallbackUrlRewriteReason =
    current === null ? 'missing-replaced' : 'relative-replaced';
  return { url: parsed.toString(), rewritten: true, reason };
}

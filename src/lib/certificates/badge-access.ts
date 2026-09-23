export function isBadgeExportAllowed(input: {
  issued: boolean;
  token: string | null | undefined;
  tokenValid: boolean;
}): boolean {
  return input.issued && Boolean(input.token) && input.tokenValid;
}

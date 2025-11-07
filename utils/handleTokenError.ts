export function handleTokenError(responseData: any): any {
  if ((responseData as any).error === 'token_revoked') {
    throw new Error(
      'Your token has been revoked. Please relogin to Slack MCP integration.'
    );
  }
  return responseData;
}

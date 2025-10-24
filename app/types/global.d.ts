declare global {
  var oauthStates: Map<string, {
    userId: string;
    platform: string;
    timestamp: number;
    expiresAt: number;
  }> | undefined;
}

export {};

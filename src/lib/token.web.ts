// The web build is only a UI preview, so the code is never persisted.
let token: string | null = null;
export const loadToken = async () => token;
export const saveToken = async (code: string) => { token = code; };

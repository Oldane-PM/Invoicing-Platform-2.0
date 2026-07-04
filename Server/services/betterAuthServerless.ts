import { auth } from "../../src/lib/auth";

export function handleBetterAuthRequest(request: Request) {
  return auth.handler(request);
}


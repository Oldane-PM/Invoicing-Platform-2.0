import { auth } from "../../../src/lib/auth.js";

function handleBetterAuthRequest(request: Request) {
  return auth.handler(request);
}

export const GET = handleBetterAuthRequest;
export const POST = handleBetterAuthRequest;
export const OPTIONS = handleBetterAuthRequest;

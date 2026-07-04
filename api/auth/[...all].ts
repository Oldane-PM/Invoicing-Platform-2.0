import { auth } from "../../src/lib/auth";

export default {
  fetch(request: Request) {
    return auth.handler(request);
  },
};

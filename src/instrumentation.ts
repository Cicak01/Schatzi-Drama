import { patchUpstreamFetch } from "@/lib/upstream-patch";

export async function register() {
  patchUpstreamFetch();
}

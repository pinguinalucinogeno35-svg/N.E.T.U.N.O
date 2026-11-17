import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Só no dev e por opt-in: o binding "AI" é remoto e exige login do wrangler
// (CLOUDFLARE_API_TOKEN), o que quebraria `next build` no CI e `next dev` sem login.
// Para testar o Workers AI localmente: CF_DEV_BINDINGS=1 npm run dev
if (process.env.NODE_ENV === "development" && process.env.CF_DEV_BINDINGS === "1") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}

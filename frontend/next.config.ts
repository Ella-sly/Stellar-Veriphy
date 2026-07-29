import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; 
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; 
              style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; 
              img-src 'self' data: https: blob:; 
              font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; 
              connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://soroban-rpc.mainnet.stellar.org https://soroban-rpc.testnet.stellar.org https://gateway.ipfs.io https://dweb.link https://*.ipfs.io wss:; 
              frame-ancestors 'none'; 
              base-uri 'self'; 
              form-action 'self'`.replace(/\s+/g, " "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

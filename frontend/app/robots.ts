import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://stellarveriphy.com";
const DEPLOY_ENV = process.env.NEXT_PUBLIC_DEPLOY_ENV || process.env.VERCEL_ENV;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const shouldBlockCrawlers = ["development", "preview", "staging"].includes(DEPLOY_ENV || "");

  return {
    rules: shouldBlockCrawlers
      ? {
          userAgent: "*",
          disallow: "/",
        }
      : {
          userAgent: "*",
          allow: "/",
        },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

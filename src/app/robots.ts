import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stratmarket.elvariscapital.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot",
          "CCBot",
          "cohere-ai",
          "Amazonbot",
        ],
        allow: [
          "/",
          "/docs",
          "/docs/*",
          "/strategies",
          "/strategies/*",
          "/research",
          "/how",
          "/market",
          "/chart",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/pdf", "/api/pdf", "/admin", "/api/auth/"],
    },
    sitemap: "https://bktk.indian-nepaliswad.fr/sitemap.xml",
  };
}

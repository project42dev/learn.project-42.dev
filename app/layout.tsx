import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ProgressProvider } from "./components/ProgressProvider";
import { AuthProvider } from "./components/AuthProvider";
import { ProfilePreferencesProvider } from "./components/ProfilePreferencesProvider";
import { CanonicalOriginEnforcer } from "./components/CanonicalOriginEnforcer";

export const metadata: Metadata = {
  metadataBase: new URL("https://project-42.dev"),
  title: {
    default: "Project 42 Learn — Learn AI with confidence",
    template: "%s · Project 42 Learn",
  },
  description:
    "Free, open, provider-neutral AI learning paths, knowledge checks, and practical activities.",
  applicationName: "Project 42 Learn",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/brand/project-42-mark.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/brand/project-42-mark-mono.svg",
        color: "#0b1225",
      },
    ],
  },
  keywords: [
    "AI learning",
    "agentic AI",
    "Anthropic",
    "OpenAI",
    "Claude",
    "ChatGPT",
    "free training",
  ],
  openGraph: {
    type: "website",
    siteName: "Project 42 Learn",
    title: "Project 42 Learn — Learn AI with confidence",
    description:
      "Free learning paths from first principles to reliable agents.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Project 42 — Start curious. Become capable.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Project 42 Learn — Learn AI with confidence",
    description:
      "Free learning paths from first principles to reliable agents.",
    images: ["/og.png"],
  },
};

import config from "../project42.config.json";

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: "#090d16",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configuredTheme = config?.theme || "06-galactic-guide";
  const configuredLayout = config?.layout?.defaultPreset || "standard";
  return (
    <html lang="en" data-theme={configuredTheme} data-layout={configuredLayout} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var defaultTheme="${configuredTheme}";var defaultLayout="${configuredLayout}";var t=localStorage.getItem("project42.theme.v1")||defaultTheme;var l=localStorage.getItem("project42.layout.v1")||defaultLayout;document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-layout",l);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <CanonicalOriginEnforcer
          canonicalOrigin={config.portal.canonicalOrigin}
          legacyOrigins={config.portal.legacyOrigins}
        />
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AuthProvider>
          <ProfilePreferencesProvider>
            <ProgressProvider>
              <SiteHeader />
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
              <SiteFooter />
            </ProgressProvider>
          </ProfilePreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

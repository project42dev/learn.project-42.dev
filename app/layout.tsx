import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { ProgressProvider } from "./components/ProgressProvider";
import { AuthProvider } from "./components/AuthProvider";
import { ProfilePreferencesProvider } from "./components/ProfilePreferencesProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://learn.project-42.dev"),
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

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0b1225",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("project42.theme.v1")||(document.cookie.match(/(?:^|;\\s*)project42\\.theme\\.v1=([^;]+)/)||[])[1];if(t){document.documentElement.setAttribute("data-theme",decodeURIComponent(t));}var l=localStorage.getItem("project42.layout.v1")||(document.cookie.match(/(?:^|;\\s*)project42\\.layout\\.v1=([^;]+)/)||[])[1];if(l){document.documentElement.setAttribute("data-layout",decodeURIComponent(l));}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
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

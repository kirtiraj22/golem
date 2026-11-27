
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import configTheme from "~/constants/mantine-theme";

export const metadata: Metadata = {
  title: "Stock Wars",
  description:
    "Win the storage lockup. Flip the loot. Own the row in Rook's Riverside.",
  applicationName: "Stock Wars",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/logo192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "Stock Wars",
    description:
      "Win the storage lockup. Flip the loot. Own the row in Rook's Riverside.",
    siteName: "Stock Wars",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Stock Wars",
    description:
      "Win the storage lockup. Flip the loot. Own the row in Rook's Riverside.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider
          theme={configTheme}
          withGlobalClasses
          defaultColorScheme="dark"
        >
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}

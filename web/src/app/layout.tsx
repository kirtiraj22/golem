
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "./globals.css";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import configTheme from "~/constants/mantine-theme";

export const metadata: Metadata = {
  title: "The Copper Stall",
  description: "A living market. Your trading story.",
  applicationName: "The Copper Stall",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/logo192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "The Copper Stall",
    description: "A living market. Your trading story.",
    siteName: "The Copper Stall",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "The Copper Stall",
    description: "A living market. Your trading story.",
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

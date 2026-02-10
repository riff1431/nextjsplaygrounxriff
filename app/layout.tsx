import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PaymentProvider } from "./context/PaymentContext";
import ToasterProvider from "@/components/providers/ToasterProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

import { createClient } from "@/utils/supabase/server";

export async function generateMetadata() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "theme_config")
    .single();

  const val = data?.value || {};
  const theme = {
    siteName: val.siteName || val.site_name || "PlayGroundX | Creator Platform",
    faviconUrl: val.faviconUrl || val.favicon_url || null
  };

  return {
    title: theme.siteName || "PlayGroundX | Creator Platform",
    description: "The ultimate playground for creators and fans.",
    icons: theme.faviconUrl ? {
      icon: theme.faviconUrl,
      shortcut: theme.faviconUrl,
      apple: theme.faviconUrl,
    } : undefined
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased bg-black text-white min-h-screen selection:bg-pink-500 selection:text-white`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <PaymentProvider>
              <NotificationProvider>
                {children}
                <ToasterProvider />
              </NotificationProvider>
            </PaymentProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PaymentProvider } from "./context/PaymentContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import ToasterProvider from "@/components/providers/ToasterProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import CookieBanner from "@/components/common/CookieBanner";
import { GuidedTourProvider } from "@/components/guided-tour/GuidedTourProvider";
import TourOverlay from "@/components/guided-tour/TourOverlay";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  
  // 1. Fetch theme settings
  const { data: themeData } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "theme_config")
    .single();

  const val = themeData?.value || {};
  const initialTheme = {
    siteName: val.siteName || val.site_name || "PlayGroundX",
    logoUrl: val.logoUrl || val.logo_url || null,
    faviconUrl: val.faviconUrl || val.favicon_url || null,
    primaryColor: val.primaryColor || val.primary_color || "#ec4899",
    logoSize: val.logoSize || val.logo_size || 36,
  };

  // 2. Fetch room settings
  const { data: settingsData } = await supabase
    .from("room_settings")
    .select("room_type, is_active");

  const initialRoomSettings = settingsData ? settingsData.reduce((acc: any, s: any) => {
    acc[s.room_type] = s.is_active;
    return acc;
  }, {} as Record<string, boolean>) : {};

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased bg-black text-white min-h-screen selection:bg-pink-500 selection:text-white`} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider initialTheme={initialTheme} initialRoomSettings={initialRoomSettings}>
            <PaymentProvider>
              <CurrencyProvider>
                <NotificationProvider>
                  <GuidedTourProvider>
                    {children}
                    <TourOverlay />
                  </GuidedTourProvider>
                  <CookieBanner />
                  <ToasterProvider />
                </NotificationProvider>
              </CurrencyProvider>
            </PaymentProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { UserManagementProvider } from "./contexts/UserManagementContext";
import { IntegrationManagementProvider } from "./contexts/IntegrationManagementContext";
import VersionIndicator from "./components/VersionIndicator";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DataDrip - Data Analytics Platform",
  description: "A modern data analytics and visualization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${manrope.variable} antialiased`}
      >
        <AuthProvider>
          <UserManagementProvider>
            <IntegrationManagementProvider>
              {/* Sidechat removed; insights chat now embedded on insights page */}
              {children}
              <VersionIndicator />
            </IntegrationManagementProvider>
          </UserManagementProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

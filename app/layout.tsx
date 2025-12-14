import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ConditionalAnalytics } from "@/components/conditional-analytics"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TextEdit - 文字編輯器",
  description: "支援 TXT 和 HTML 編輯與預覽的 PWA 文字編輯器",
  generator: "v0.app",
  manifest: "/Teditor/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TextEdit",
  },
  icons: {
    icon: [
      {
        url: "/Teditor/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/Teditor/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/Teditor/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/Teditor/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1e1e" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW" className="dark">
      <body className={`font-sans antialiased`}>
        {children}
        <ConditionalAnalytics />
      </body>
    </html>
  )
}

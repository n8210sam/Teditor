"use client"

import { Analytics } from "@vercel/analytics/next"
import { useEffect, useState } from "react"

/**
 * 條件式 Analytics 元件
 * 只在非 PWA 模式（網頁瀏覽）時載入 Vercel Analytics
 * PWA 安裝版本會自動停用 Analytics
 */
export function ConditionalAnalytics() {
  const [isPWA, setIsPWA] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // 檢測是否在 PWA standalone 模式運行
    const isStandalone =
      // 標準的 display-mode: standalone 檢測
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari 的 standalone 模式
      (window.navigator as any).standalone === true ||
      // Android WebAPK 檢測
      document.referrer.includes("android-app://")

    setIsPWA(isStandalone)

    // 開發模式下顯示檢測結果
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] PWA 模式:", isStandalone ? "是 (已停用)" : "否 (已啟用)")
    }
  }, [])

  // SSR 時不渲染
  if (!isClient) return null

  // PWA 模式下不載入 Analytics
  if (isPWA) return null

  return <Analytics />
}

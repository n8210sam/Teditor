"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function UpdatePrompt() {
    const [needUpdate, setNeedUpdate] = useState(false)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            // 監聽 Service Worker 註冊與更新狀態
            navigator.serviceWorker.ready.then((reg) => {
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                setNeedUpdate(true)
                                setRegistration(reg)
                            }
                        })
                    }
                })

                // 若前次載入已有 pending 更新
                if (reg.waiting) {
                    setNeedUpdate(true)
                    setRegistration(reg)
                }
            })

            // 監聽重新載入事件，確保 skipWaiting 生效後立刻重整更新
            let refreshing = false
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    refreshing = true
                    window.location.reload()
                }
            })
        }
    }, [])

    useEffect(() => {
        if (needUpdate) {
            const timer = setTimeout(() => {
                setNeedUpdate(false)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [needUpdate])

    if (!needUpdate) return null

    const handleUpdate = () => {
        if (registration && registration.waiting) {
            // 傳遞訊息給 SW 通知其 skip waiting
            registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }
    }

    // 使用非 fixed layout 讓此區塊實際佔用空間，並置於最頂部
    return (
        <div className="w-full bg-blue-600 text-white text-sm px-4 py-2 flex flex-row items-center justify-between shrink-0">
            <span>發現新版本，點擊更新以體驗最新功能。</span>
            <Button
                onClick={handleUpdate}
                variant="secondary"
                size="sm"
                className="h-7 px-3 text-xs bg-white text-blue-600 hover:bg-gray-100"
            >
                立即更新
            </Button>
        </div>
    )
}

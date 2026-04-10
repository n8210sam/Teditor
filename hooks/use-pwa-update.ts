import { useEffect, useState, useCallback } from "react"

export function usePWAUpdate() {
    const [needUpdate, setNeedUpdate] = useState(false)
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
                const checkUpdate = () => {
                    if (reg.waiting) {
                        setNeedUpdate(true)
                        setRegistration(reg)
                    }
                }

                // 初始檢查
                checkUpdate()

                // 監聽更新發現事件
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
            })

            // 監聽控制器變更（skipWaiting 生效後）
            let refreshing = false
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                if (!refreshing) {
                    refreshing = true
                    window.location.reload()
                }
            })
        }
    }, [])

    const updateApp = useCallback(() => {
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }
    }, [registration])

    return { needUpdate, updateApp }
}

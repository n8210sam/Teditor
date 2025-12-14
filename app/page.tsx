'use client'
import dynamic from 'next/dynamic'

const TextEditor = dynamic(() => import('@/components/text-editor').then(m => m.TextEditor), { ssr: false })

export default function Home() {
  return (
    <main className="h-screen w-full overflow-hidden">
      <TextEditor />
    </main>
  )
}

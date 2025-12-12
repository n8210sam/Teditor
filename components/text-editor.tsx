"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText,
  Code,
  Eye,
  Upload,
  FileUp,
  Bold,
  Italic,
  Underline,
  LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreVertical,
  Copy,
  ClipboardPaste,
  MousePointer2,
  ChevronsLeft,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type EditorMode = "txt" | "html"

export function TextEditor() {
  const [content, setContent] = useState("")
  const [mode, setMode] = useState<EditorMode>("txt")
  const [fileName, setFileName] = useState("untitled")
  const [fileExtension, setFileExtension] = useState(".txt")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }, [])

  useEffect(() => {
    if (mode === "html" && editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content
    }
  }, [content, mode])

  const handleOpenFile = useCallback(async () => {
    try {
      if ("showOpenFilePicker" in window) {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: "Text Files",
              accept: {
                "text/*": [".txt", ".html", ".htm", ".md", ".json", ".xml", ".css", ".js", ".ts"],
              },
            },
          ],
          multiple: false,
        })
        fileHandleRef.current = fileHandle
        const file = await fileHandle.getFile()
        const text = await file.text()
        setContent(text)

        const name = file.name
        const lastDotIndex = name.lastIndexOf(".")
        if (lastDotIndex > 0) {
          setFileName(name.substring(0, lastDotIndex))
          setFileExtension(name.substring(lastDotIndex))
          if (name.endsWith(".html") || name.endsWith(".htm")) {
            setMode("html")
          } else {
            setMode("txt")
          }
        }
      } else {
        fileInputRef.current?.click()
      }
    } catch (error) {
      console.log("File open cancelled or error:", error)
    }
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setContent(text)

        const name = file.name
        const lastDotIndex = name.lastIndexOf(".")
        if (lastDotIndex > 0) {
          setFileName(name.substring(0, lastDotIndex))
          setFileExtension(name.substring(lastDotIndex))
          if (name.endsWith(".html") || name.endsWith(".htm")) {
            setMode("html")
          } else {
            setMode("txt")
          }
        }
      }
      reader.readAsText(file)
    }
  }, [])

  const handleSaveWithExtension = useCallback(
    async (customFileName: string, customExtension: string) => {
      const fullFileName = `${customFileName}${customExtension}`

      try {
        if ("showSaveFilePicker" in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fullFileName,
            types: [
              {
                description: "Text Files",
                accept: { "text/*": [customExtension] },
              },
            ],
          })
          const writable = await handle.createWritable()
          await writable.write(content)
          await writable.close()
          fileHandleRef.current = handle
          setFileName(customFileName)
          setFileExtension(customExtension)
        } else {
          const blob = new Blob([content], { type: "text/plain" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = fullFileName
          a.click()
          URL.revokeObjectURL(url)
        }
        setShowSaveDialog(false)
      } catch (error) {
        console.log("Save cancelled or error:", error)
      }
    },
    [content],
  )

  const handleQuickSave = useCallback(async () => {
    if (fileHandleRef.current) {
      try {
        const writable = await fileHandleRef.current.createWritable()
        await writable.write(content)
        await writable.close()
      } catch (error) {
        console.log("Quick save error:", error)
        setShowSaveDialog(true)
      }
    } else {
      setShowSaveDialog(true)
    }
  }, [content])

  const handleNewFile = useCallback(() => {
    setContent("")
    setFileName("untitled")
    setFileExtension(".txt")
    setMode("txt")
    fileHandleRef.current = null
  }, [])

  const handlePreview = useCallback(() => {
    const blob = new Blob([content], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [content])

  const handleSelectAll = useCallback(() => {
    if (editorRef.current) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(editorRef.current)
      selection?.removeAllRanges()
      selection?.addRange(range)
      editorRef.current.focus()
    }
  }, [])

  const handleCopy = useCallback(() => {
    document.execCommand("copy")
  }, [])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      document.execCommand("insertText", false, text)
    } catch (err) {
      console.log("Paste failed:", err)
    }
  }, [])

  const moveCursor = useCallback((direction: "start" | "left" | "up" | "down" | "right" | "end") => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)

    switch (direction) {
      case "start":
        range.setStart(editorRef.current, 0)
        range.collapse(true)
        break
      case "end":
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        break
      case "left":
        range.setStart(range.startContainer, Math.max(0, range.startOffset - 1))
        range.collapse(true)
        break
      case "right":
        range.setStart(range.startContainer, range.startOffset + 1)
        range.collapse(true)
        break
      case "up":
      case "down":
        // Simulate arrow key press for up/down movement
        const event = new KeyboardEvent("keydown", {
          key: direction === "up" ? "ArrowUp" : "ArrowDown",
          bubbles: true,
        })
        editorRef.current.dispatchEvent(event)
        return
    }

    selection.removeAllRanges()
    selection.addRange(range)
    editorRef.current.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleQuickSave()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault()
        handleOpenFile()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleQuickSave, handleOpenFile])

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-medium">
            {fileName}
            {fileExtension}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleNewFile}>
              <FileUp className="h-4 w-4 mr-2" />
              新增
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenFile}>
              <Upload className="h-4 w-4 mr-2" />
              開啟
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
              <FileText className="h-4 w-4 mr-2" />
              另存新檔
            </Button>
            {mode === "html" && (
              <Button variant="outline" size="sm" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                預覽
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={mode === "txt" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setMode("txt")}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant={mode === "html" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setMode("html")}
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleNewFile}>
                <FileUp className="h-4 w-4 mr-2" />
                新增
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenFile}>
                <Upload className="h-4 w-4 mr-2" />
                開啟
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                <FileText className="h-4 w-4 mr-2" />
                另存新檔
              </DropdownMenuItem>
              {mode === "html" && (
                <DropdownMenuItem onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  預覽
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {mode === "html" && (
        <>
          <div className="sticky top-[57px] z-40 flex items-center border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="shrink-0 px-4 py-2 bg-card/95">
              <Button variant="ghost" size="sm" className="h-8" onClick={handlePreview} title="預覽">
                <Eye className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">預覽</span>
              </Button>
            </div>
            <div className="w-px h-6 bg-border shrink-0" />
            <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("bold")}
                title="粗體"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("italic")}
                title="斜體"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("underline")}
                title="底線"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1 shrink-0" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("justifyLeft")}
                title="靠左對齊"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("justifyCenter")}
                title="置中對齊"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("justifyRight")}
                title="靠右對齊"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1 shrink-0" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("insertUnorderedList")}
                title="無序列表"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => execCommand("insertOrderedList")}
                title="有序列表"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1 shrink-0" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  const url = prompt("輸入連結網址:")
                  if (url) execCommand("createLink", url)
                }}
                title="插入連結"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 shrink-0">
                    標題
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => execCommand("formatBlock", "<h1>")}>標題 1</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => execCommand("formatBlock", "<h2>")}>標題 2</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => execCommand("formatBlock", "<h3>")}>標題 3</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => execCommand("formatBlock", "<p>")}>段落</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="sticky top-[105px] z-40 flex items-center gap-1 px-4 py-2 border-b border-border bg-card/95 backdrop-blur-sm overflow-x-auto">
            <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={handleSelectAll} title="全選">
              <MousePointer2 className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">全選</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={handleCopy} title="複製">
              <Copy className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">複製</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={handlePaste} title="貼上">
              <ClipboardPaste className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">貼上</span>
            </Button>

            <div className="w-px h-6 bg-border mx-2 shrink-0" />

            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => moveCursor("start")}
                title="移到開頭"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveCursor("left")} title="向左">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveCursor("up")} title="向上">
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveCursor("down")} title="向下">
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveCursor("right")} title="向右">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => moveCursor("end")}
                title="移到結尾"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 overflow-auto">
        {mode === "txt" ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="輸入文字..."
            className="h-full resize-none rounded-none border-0 font-mono text-sm leading-relaxed editor-scrollbar focus-visible:ring-0"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="h-full px-4 py-3 outline-none editor-scrollbar prose prose-sm max-w-none dark:prose-invert"
            style={{ minHeight: "100%" }}
          />
        )}
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>另存新檔</DialogTitle>
            <DialogDescription>輸入檔案名稱和副檔名</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const name = formData.get("fileName") as string
              const ext = formData.get("fileExtension") as string
              handleSaveWithExtension(name, ext)
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="fileName">檔案名稱</Label>
              <Input id="fileName" name="fileName" defaultValue={fileName} placeholder="untitled" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileExtension">副檔名</Label>
              <Input
                id="fileExtension"
                name="fileExtension"
                defaultValue={fileExtension}
                placeholder=".txt"
                required
                pattern="\..*"
                title="副檔名必須以點開頭，例如 .txt"
              />
            </div>
            <Button type="submit" className="w-full">
              儲存
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.html,.htm,.md,.json,.xml,.css,.js,.ts"
        onChange={handleFileInputChange}
      />
    </div>
  )
}

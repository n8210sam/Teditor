"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Code, Upload, FileUp, MoreVertical, RefreshCw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocalStorage } from "usehooks-ts"
import { usePWAUpdate } from "@/hooks/use-pwa-update"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditingToolbar, FormattingToolbar, CursorNavigationButtons, MainEditingControls } from "./editor-toolbar"

type EditorMode = "txt" | "html"

export function TextEditor() {
  const { needUpdate, updateApp } = usePWAUpdate()
  const [content, setContent] = useLocalStorage("editor_content", "")
  const [mode, setMode] = useLocalStorage<EditorMode>("editor_mode", "txt")
  const [fileName, setFileName] = useLocalStorage("editor_fileName", "untitled")
  const [fileExtension, setFileExtension] = useLocalStorage("editor_fileExtension", ".txt")
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // simple history for TXT mode
  const txtHistoryRef = useRef<string[]>([])
  const txtFutureRef = useRef<string[]>([])
  // HTML 模式也維持自有歷史，避免依賴瀏覽器 undo stack 在切換節點後遺失
  const htmlHistoryRef = useRef<string[]>([])
  const htmlFutureRef = useRef<string[]>([])
  const MAX_HISTORY = 100
  const pushTxtHistory = (val: string) => {
    const hist = txtHistoryRef.current
    if (hist.length === 0 || hist[hist.length - 1] !== val) {
      hist.push(val)
      if (hist.length > MAX_HISTORY) hist.shift()
    }
    txtFutureRef.current.length = 0
  }
  const pushHtmlHistory = (val: string) => {
    const hist = htmlHistoryRef.current
    if (hist.length === 0 || hist[hist.length - 1] !== val) {
      hist.push(val)
      if (hist.length > MAX_HISTORY) hist.shift()
    }
    htmlFutureRef.current.length = 0
  }

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      // 在 HTML 模式，先推入舊內容到歷史，再同步新內容
      pushHtmlHistory(content)
      setContent(editorRef.current.innerHTML)
    }
  }, [content])

  const execCommand = useCallback((command: string, value?: string) => {
    // Ensure the editable element is focused before executing the command
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    // 執行後同步內容與歷史
    handleEditorInput()
  }, [handleEditorInput])

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

  // #region Action Handlers
  const handleSelectAll = useCallback(() => {
    if (mode === "txt") {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    } else {
      if (editorRef.current) {
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        selection?.removeAllRanges()
        selection?.addRange(range)
        editorRef.current.focus()
      }
    }
  }, [mode])

  const handleCopy = useCallback(async () => {
    const target = mode === "txt" ? textareaRef.current : editorRef.current
    if (!target) return

    if (mode === "txt" && target instanceof HTMLTextAreaElement) {
      try {
        const selected = target.value.substring(target.selectionStart, target.selectionEnd)
        await navigator.clipboard.writeText(selected || target.value)
        target.focus() // 保持焦點以維持選取反白
      } catch (err) {
        console.log("TXT copy failed:", err)
      }
    } else {
      target.focus()
      document.execCommand("copy")
    }
  }, [mode])

  const handleRichPaste = useCallback(async () => {
    const target = mode === "txt" ? textareaRef.current : editorRef.current
    if (!target) return
    target.focus()

    try {
      if (mode === 'html') {
        const clipboardItems = await navigator.clipboard.read()
        let foundHtml = false

        for (const item of clipboardItems) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html')
            const html = await blob.text()

            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')
            doc.body.querySelectorAll('*').forEach(el => el.removeAttribute('style'))

            const sanitizedHtml = doc.body.innerHTML
            document.execCommand('insertHTML', false, '\n' + sanitizedHtml + '\n')
            foundHtml = true
            break
          }
        }

        if (!foundHtml) {
          const textToPaste = await navigator.clipboard.readText()
          document.execCommand('insertText', false, '\n' + textToPaste + '\n')
        }
        handleEditorInput()
      } else { // Text mode
        const textToPaste = await navigator.clipboard.readText()
        // 使用 execCommand('insertText') 自動處理選區取代、光標位置與 Undo 歷史
        const success = document.execCommand('insertText', false, textToPaste)
        
        // 如果 execCommand 失敗（某些瀏覽器限制），則回退到手動更新
        if (!success) {
          const ta = target as HTMLTextAreaElement
          const start = ta.selectionStart
          const end = ta.selectionEnd
          pushTxtHistory(content)
          const newContent = content.slice(0, start) + textToPaste + content.slice(end)
          setContent(newContent)
          setTimeout(() => {
            ta.focus()
            const newPos = start + textToPaste.length
            ta.setSelectionRange(newPos, newPos)
          }, 0)
        } else {
          // execCommand 會觸發 onChange，但如果是受控組件可能需要手動觸發一次狀態同步
          // 這裡由於 Textarea 的 value={content} 是受控的，我們需要確保內容同步回狀態
          setContent((target as HTMLTextAreaElement).value)
        }
      }
    } catch (err) {
      console.error("Rich paste failed:", err)
    }
  }, [mode, content, setContent, handleEditorInput])

  const handlePlainTextPaste = useCallback(async () => {
    const target = mode === "txt" ? textareaRef.current : editorRef.current
    if (!target) return
    target.focus()

    try {
      const textToPaste = await navigator.clipboard.readText()
      if (mode === 'html') {
        const selection = window.getSelection()
        if (!selection?.rangeCount) return

        const range = selection.getRangeAt(0)
        range.deleteContents()

        const textNode = document.createTextNode('\n' + textToPaste + '\n')
        range.insertNode(textNode)

        range.setStartAfter(textNode)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        handleEditorInput()
      } else { // Text mode
        const success = document.execCommand('insertText', false, textToPaste)
        if (!success) {
          const ta = target as HTMLTextAreaElement
          const start = ta.selectionStart
          const end = ta.selectionEnd
          pushTxtHistory(content)
          const newContent = content.slice(0, start) + textToPaste + content.slice(end)
          setContent(newContent)
          setTimeout(() => {
            ta.focus()
            const newPos = start + textToPaste.length
            ta.setSelectionRange(newPos, newPos)
          }, 0)
        } else {
          setContent((target as HTMLTextAreaElement).value)
        }
      }
    } catch (err) {
      console.error("Plain text paste failed:", err)
    }
  }, [mode, content, setContent, handleEditorInput])

  const handleCut = useCallback(async () => {
    const target = mode === "txt" ? textareaRef.current : editorRef.current
    if (!target) return
    target.focus()

    if (mode === "txt" && target instanceof HTMLTextAreaElement) {
      try {
        const start = target.selectionStart
        const end = target.selectionEnd
        if (start === end) return
        await navigator.clipboard.writeText(target.value.substring(start, end))
        pushTxtHistory(content)
        // 使用 execCommand('delete') 以維持正確的插入點行為與 Undo 歷史
        document.execCommand('delete')
        setContent(target.value)
      } catch (err) {
        console.log("TXT cut failed:", err)
      }
    } else {
      execCommand("cut")
    }
  }, [mode, content, setContent, execCommand])

  const handleDelete = useCallback(() => {
    const target = mode === "txt" ? textareaRef.current : editorRef.current
    if (!target) return
    target.focus()

    if (mode === "txt" && target instanceof HTMLTextAreaElement) {
      pushTxtHistory(content)
      document.execCommand('delete')
      setContent(target.value)
    } else {
      execCommand("delete")
    }
  }, [mode, content, setContent, execCommand])

  const handleUndo = useCallback(() => {
    if (mode === "html") {
      const prev = htmlHistoryRef.current.pop()
      if (prev !== undefined) {
        htmlFutureRef.current.push(content)
        setContent(prev)
        requestAnimationFrame(() => {
          editorRef.current?.focus()
        })
      }
      return
    }
    if (mode === "txt") {
      const prev = txtHistoryRef.current.pop()
      if (prev !== undefined) {
        txtFutureRef.current.push(content)
        setContent(prev)
        requestAnimationFrame(() => {
          const ta = textareaRef.current
          if (ta) {
            const pos = Math.min(prev.length, ta.value.length)
            ta.selectionStart = ta.selectionEnd = pos
            ta.focus()
          }
        })
      }
    }
  }, [mode, content])

  const handleRedo = useCallback(() => {
    if (mode === "html") {
      const next = htmlFutureRef.current.pop()
      if (next !== undefined) {
        htmlHistoryRef.current.push(content)
        setContent(next)
        requestAnimationFrame(() => {
          editorRef.current?.focus()
        })
      }
      return
    }
    if (mode === "txt") {
      const next = txtFutureRef.current.pop()
      if (next !== undefined) {
        txtHistoryRef.current.push(content)
        setContent(next)
        requestAnimationFrame(() => {
          const ta = textareaRef.current
          if (ta) {
            const pos = Math.min(next.length, ta.value.length)
            ta.selectionStart = ta.selectionEnd = pos
            ta.focus()
          }
        })
      }
    }
  }, [mode, content])

  const moveCursor = useCallback(
    (direction: "start" | "left" | "up" | "down" | "right" | "end") => {
      const target = mode === "txt" ? textareaRef.current : editorRef.current
      if (!target) return

      target.focus()
      const selection = window.getSelection()
      if (!selection) return

      switch (direction) {
        case "start":
          if (target instanceof HTMLTextAreaElement) {
            target.setSelectionRange(0, 0)
          } else {
            const range = document.createRange()
            range.selectNodeContents(target)
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
          }
          break
        case "end":
          if (target instanceof HTMLTextAreaElement) {
            const len = target.value.length
            target.setSelectionRange(len, len)
          } else {
            const range = document.createRange()
            range.selectNodeContents(target)
            range.collapse(false)
            selection.removeAllRanges()
            selection.addRange(range)
          }
          break
        case "left":
          selection.modify("move", "backward", "character")
          break
        case "right":
          selection.modify("move", "forward", "character")
          break
        case "up":
          selection.modify("move", "backward", "line")
          break
        case "down":
          selection.modify("move", "forward", "line")
          break
      }
    },
    [mode],
  )
  // #endregion

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
      // Undo / Redo for both modes via keyboard，HTML 模式也改為自管堆疊
      if ((e.metaKey || e.ctrlKey)) {
        const key = e.key.toLowerCase()
        if (key === 'z') {
          e.preventDefault()
          if (e.shiftKey) {
            handleRedo()
          } else {
            handleUndo()
          }
        } else if (key === 'y') {
          e.preventDefault()
          handleRedo()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleQuickSave, handleOpenFile, handleUndo, handleRedo])

  const fileActions = [
    { label: "新增", icon: FileUp, handler: handleNewFile },
    { label: "開啟", icon: Upload, handler: handleOpenFile },
    { label: "另存新檔", icon: FileText, handler: () => setShowSaveDialog(true) },
  ]

  return (
    <div className="zh-文字編輯器 en-text-editor flex flex-col h-full bg-background" suppressHydrationWarning>
      <header className="zh-工具列-頁首 en-toolbar-header sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-medium">
            {fileName}
            {fileExtension}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="zh-檔案動作 en-file-actions hidden md:flex items-center gap-2">
            {fileActions.map((action, index) => (
              <Button key={index} variant="outline" size="sm" onClick={action.handler}>
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant={needUpdate ? "default" : "outline"}
              size="sm"
              onClick={updateApp}
              disabled={!needUpdate}
              className={needUpdate ? "bg-blue-600 hover:bg-blue-700 text-white animate-pulse" : ""}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${needUpdate ? "animate-spin" : ""}`} />
              版本更新
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="outline" size="sm" className="h-8 px-3 bg-transparent">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {fileActions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={action.handler}>
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={updateApp}
                disabled={!needUpdate}
                className={needUpdate ? "text-blue-600 font-semibold" : ""}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${needUpdate ? "animate-spin" : ""}`} />
                版本更新
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <MainEditingControls
        onSelectAll={handleSelectAll}
        onCopy={handleCopy}
        onRichPaste={handleRichPaste}
        onPlainTextPaste={handlePlainTextPaste}
        onCut={handleCut}
        onDelete={handleDelete}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoDisabled={mode === 'txt' ? txtHistoryRef.current.length === 0 : htmlHistoryRef.current.length === 0}
        redoDisabled={mode === 'txt' ? txtFutureRef.current.length === 0 : htmlFutureRef.current.length === 0}
        onMove={moveCursor}
        mode={mode}
        onChangeMode={setMode}
      />

      {mode === "html" && (
        <div className="zh-格式化工具列 en-formatting-toolbar-wrapper sticky top-[105px] z-40 flex items-center border-b border-border bg-card/95 backdrop-blur-sm">
          <FormattingToolbar onPreview={handlePreview} onExecCommand={execCommand} />
        </div>
      )}

      <div className="zh-內容區 en-content-area flex-1 overflow-auto">
        {mode === "txt" ? (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { pushTxtHistory(content); setContent(e.target.value) }}
            placeholder="輸入文字..."
            className="h-full resize-none rounded-none border-0 font-mono text-sm leading-relaxed editor-scrollbar focus-visible:ring-0"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            className="zh-HTML編輯區 en-html-editor h-full px-4 py-3 outline-none editor-scrollbar prose prose-sm max-w-none dark:prose-invert"
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
            className="zh-另存新檔表單 en-save-as-form space-y-4"
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

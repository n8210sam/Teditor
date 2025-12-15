"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Code, Upload, FileUp, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocalStorage } from "usehooks-ts"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditingToolbar, FormattingToolbar, CursorNavigationButtons, MainEditingControls } from "./editor-toolbar"

type EditorMode = "txt" | "html"

export function TextEditor() {
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
  const MAX_HISTORY = 100
  const pushTxtHistory = (val: string) => {
    const hist = txtHistoryRef.current
    if (hist.length === 0 || hist[hist.length - 1] !== val) {
      hist.push(val)
      if (hist.length > MAX_HISTORY) hist.shift()
    }
    txtFutureRef.current.length = 0
  }

  const execCommand = useCallback((command: string, value?: string) => {
    // Ensure the editable element is focused before executing the command
    editorRef.current?.focus()
    document.execCommand(command, false, value)
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
    if (mode === "txt" && textareaRef.current) {
      try {
        const ta = textareaRef.current
        const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd)
        await navigator.clipboard.writeText(selected || ta.value)
      } catch (err) {
        console.log("TXT copy failed:", err)
      }
    } else {
      document.execCommand("copy")
    }
  }, [mode])

  const handleRichPaste = useCallback(async () => {
    editorRef.current?.focus(); 
    try {
        if (mode === 'html') {
            const clipboardItems = await navigator.clipboard.read();
            let foundHtml = false;

            for (const item of clipboardItems) {
                if (item.types.includes('text/html')) {
                    const blob = await item.getType('text/html');
                    const html = await blob.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    doc.body.querySelectorAll('*').forEach(el => el.removeAttribute('style'));
                    
                    const sanitizedHtml = doc.body.innerHTML;
                    // Use execCommand to ensure the operation participates in the browser undo stack
                    document.execCommand('insertHTML', false, '\n' + sanitizedHtml + '\n');
                    foundHtml = true;
                    break;
                }
            }

            if (!foundHtml) {
                const textToPaste = await navigator.clipboard.readText();
                document.execCommand('insertText', false, '\n' + textToPaste + '\n');
            }
            handleEditorInput(); // sync state
        } else { // Text mode
            const textToPaste = await navigator.clipboard.readText();
            const ta = textareaRef.current;
            if (ta) {
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                pushTxtHistory(content);
                setContent(prev => prev.slice(0, start) + textToPaste + prev.slice(end));
                requestAnimationFrame(() => {
                    ta.selectionStart = ta.selectionEnd = start + textToPaste.length;
                });
            }
        }
    } catch (err) {
        console.error("Rich paste failed:", err);
    }
  }, [mode, handleEditorInput]);

  const handlePlainTextPaste = useCallback(async () => {
      editorRef.current?.focus();
      try {
          const textToPaste = await navigator.clipboard.readText();
          if (mode === 'html') {
              const selection = window.getSelection();
              if (!selection?.rangeCount) return;

              const range = selection.getRangeAt(0);
              range.deleteContents();

              const textNode = document.createTextNode('\n' + textToPaste + '\n');
              range.insertNode(textNode);

              // Move cursor to the end of the inserted text
              range.setStartAfter(textNode);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              handleEditorInput(); // Manually trigger state update
          } else { // Text mode
              const ta = textareaRef.current;
              if (ta) {
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  pushTxtHistory(content);
                  setContent(prev => prev.slice(0, start) + textToPaste + prev.slice(end));
                  requestAnimationFrame(() => {
                      ta.selectionStart = ta.selectionEnd = start + textToPaste.length;
                  });
              }
          }
      } catch (err) {
          console.error("Plain text paste failed:", err);
      }
  }, [mode, handleEditorInput]);

  const handleCut = useCallback(async () => {
    if (mode === "txt" && textareaRef.current) {
      try {
        const ta = textareaRef.current
        const start = ta.selectionStart
        const end = ta.selectionEnd
        if (start === end) return
        await navigator.clipboard.writeText(ta.value.substring(start, end))
        pushTxtHistory(content)
        setContent(ta.value.slice(0, start) + ta.value.slice(end))
        requestAnimationFrame(() => {
          ta.focus()
          ta.setSelectionRange(start, start)
        })
      } catch (err) {
        console.log("TXT cut failed:", err)
      }
    } else {
      execCommand("cut")
    }
  }, [mode, execCommand])

  const handleUndo = useCallback(() => {
    if (mode === "html") {
      execCommand("undo")
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
  }, [mode, execCommand, content])

  const handleRedo = useCallback(() => {
    if (mode === "html") {
      execCommand("redo")
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
  }, [mode, execCommand, content])

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
      // Undo / Redo for TXT mode via keyboard
      if (mode === 'txt' && (e.metaKey || e.ctrlKey)) {
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
  }, [handleQuickSave, handleOpenFile, mode, handleUndo, handleRedo])

  const fileActions = [
    { label: "新增", icon: FileUp, handler: handleNewFile },
    { label: "開啟", icon: Upload, handler: handleOpenFile },
    { label: "另存新檔", icon: FileText, handler: () => setShowSaveDialog(true) },
  ]

  return (
    <div className="flex flex-col h-full bg-background" suppressHydrationWarning>
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
            {fileActions.map((action, index) => (
              <Button key={index} variant="outline" size="sm" onClick={action.handler}>
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
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
              {fileActions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={action.handler}>
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoDisabled={mode === 'txt' ? txtHistoryRef.current.length === 0 : false}
        redoDisabled={mode === 'txt' ? txtFutureRef.current.length === 0 : false}
        onMove={moveCursor}
      />

      {mode === "html" && (
        <div className="sticky top-[105px] z-40 flex items-center border-b border-border bg-card/95 backdrop-blur-sm">
          <FormattingToolbar onPreview={handlePreview} onExecCommand={execCommand} />
        </div>
      )}

      <div className="flex-1 overflow-auto">
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

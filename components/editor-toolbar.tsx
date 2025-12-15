"use client"

import type React from "react"
import {
  MousePointer2, Copy, ClipboardPaste, Scissors, Undo2, Redo2, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, LinkIcon, ChevronsLeft, ChevronLeft, ChevronUp, ChevronDown, ChevronRight, ChevronsRight, Eye, ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Reusable ActionButton component
interface ActionButtonProps {
  label: string
  onClick: () => void
  icon: React.ElementType
  disabled?: boolean
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, icon: Icon, disabled }) => (
  <Button variant="ghost" size="sm" className="h-8 shrink-0" onClick={onClick} title={label} disabled={disabled}>
    <Icon className="h-4 w-4 md:mr-1" />
    <span className="hidden md:inline">{label}</span>
  </Button>
)

const IconOnlyButton: React.FC<ActionButtonProps> = ({ label, onClick, icon: Icon, disabled }) => (
  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClick} title={label} disabled={disabled}>
    <Icon className="h-4 w-4" />
  </Button>
)

// --- Exported Toolbar Components ---

// 1. Cursor Navigation
interface CursorNavigationButtonsProps {
  onMove: (direction: "start" | "left" | "up" | "down" | "right" | "end") => void
  className?: string
}

export function CursorNavigationButtons({ onMove, className = "" }: CursorNavigationButtonsProps) {
  const buttons = [
    { dir: "start", label: "移到開頭", icon: ChevronsLeft },
    { dir: "left", label: "向左", icon: ChevronLeft },
    { dir: "up", label: "向上", icon: ChevronUp },
    { dir: "down", label: "向下", icon: ChevronDown },
    { dir: "right", label: "向右", icon: ChevronRight },
    { dir: "end", label: "移到結尾", icon: ChevronsRight },
  ] as const

  return (
    <div className={`zh-游標導覽按鈕 en-cursor-navigation flex items-center gap-0.5 shrink-0 ${className}`}>
      {buttons.map(({ dir, label, icon: Icon }) => (
        <Button key={dir} variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove(dir)} title={label}>
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}

// NEW: MainEditingControls component
interface MainEditingControlsProps extends EditingToolbarProps, CursorNavigationButtonsProps {}

export function MainEditingControls(props: MainEditingControlsProps) {
  return (
    <div
      className="zh-主編輯控制 en-main-editing-controls sticky top-[57px] z-40 flex flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2 border-b border-border bg-card/95 backdrop-blur-sm"
    >
      <EditingToolbar
        onSelectAll={props.onSelectAll}
        onCopy={props.onCopy}
        onRichPaste={props.onRichPaste}
        onPlainTextPaste={props.onPlainTextPaste}
        onCut={props.onCut}
        onUndo={props.onUndo}
        onRedo={props.onRedo}
      />
      <div className="zh-工具列-分隔線 en-toolbar-separator hidden md:block w-px h-6 bg-border mx-2 shrink-0" />
      <CursorNavigationButtons onMove={props.onMove} className="md:hidden" />
    </div>
  )
}

// 2. Editing Actions (Copy, Paste, etc.)
interface EditingToolbarProps {
  onSelectAll: () => void
  onCopy: () => void
  onRichPaste: () => void
  onPlainTextPaste: () => void
  onCut: () => void
  onUndo: () => void
  onRedo: () => void
  undoDisabled?: boolean
  redoDisabled?: boolean
}

export function EditingToolbar(props: EditingToolbarProps) {
  const buttons: ActionButtonProps[] = [
    { label: "全選", onClick: props.onSelectAll, icon: MousePointer2 },
    { label: "複製", onClick: props.onCopy, icon: Copy },
    { label: "貼上", onClick: props.onRichPaste, icon: ClipboardPaste },
    { label: "純文字貼上", onClick: props.onPlainTextPaste, icon: ClipboardList },
    { label: "剪下", onClick: props.onCut, icon: Scissors },
    { label: "復原", onClick: props.onUndo, icon: Undo2, disabled: props.undoDisabled },
    { label: "重做", onClick: props.onRedo, icon: Redo2, disabled: props.redoDisabled },
  ]
  return (
    <>
      {buttons.map((btn) => (
        <ActionButton key={btn.label} {...btn} />
      ))}
    </>
  )
}



// 3. HTML Formatting Actions
interface FormattingToolbarProps {
    onPreview: () => void;
    onExecCommand: (command: string, value?: string) => void;
}

export function FormattingToolbar({ onPreview, onExecCommand }: FormattingToolbarProps) {
    const formatButtons1: ActionButtonProps[] = [
        { label: "粗體", onClick: () => onExecCommand("bold"), icon: Bold },
        { label: "斜體", onClick: () => onExecCommand("italic"), icon: Italic },
        { label: "底線", onClick: () => onExecCommand("underline"), icon: Underline },
    ];
    const formatButtons2: ActionButtonProps[] = [
        { label: "靠左對齊", onClick: () => onExecCommand("justifyLeft"), icon: AlignLeft },
        { label: "置中對齊", onClick: () => onExecCommand("justifyCenter"), icon: AlignCenter },
        { label: "靠右對齊", onClick: () => onExecCommand("justifyRight"), icon: AlignRight },
    ];
    const formatButtons3: ActionButtonProps[] = [
        { label: "無序列表", onClick: () => onExecCommand("insertUnorderedList"), icon: List },
        { label: "有序列表", onClick: () => onExecCommand("insertOrderedList"), icon: ListOrdered },
    ];
    const linkButton: ActionButtonProps = {
        label: "插入連結",
        onClick: () => {
          const url = prompt("輸入連結網址:")
          if (url) onExecCommand("createLink", url)
        },
        icon: LinkIcon,
    };
    const headingItems = [
        { label: "標題 1", onClick: () => onExecCommand("formatBlock", "<h1>") },
        { label: "標題 2", onClick: () => onExecCommand("formatBlock", "<h2>") },
        { label: "標題 3", onClick: () => onExecCommand("formatBlock", "<h3>") },
        { label: "段落", onClick: () => onExecCommand("formatBlock", "<p>") },
    ];

    return (
        <>
            <div className="shrink-0 px-4 py-2 bg-card/95">
                <Button variant="ghost" size="sm" className="h-8" onClick={onPreview} title="預覽">
                    <Eye className="h-4 w-4 md:mr-1" />
                    <span className="hidden md:inline">預覽</span>
                </Button>
            </div>
            <div className="w-px h-6 bg-border shrink-0" />
            <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
                {formatButtons1.map((btn, i) => <IconOnlyButton key={i} {...btn} />)}
                <div className="w-px h-6 bg-border mx-1 shrink-0" />
                {formatButtons2.map((btn, i) => <IconOnlyButton key={i} {...btn} />)}
                <div className="w-px h-6 bg-border mx-1 shrink-0" />
                {formatButtons3.map((btn, i) => <IconOnlyButton key={i} {...btn} />)}
                <div className="w-px h-6 bg-border mx-1 shrink-0" />
                <IconOnlyButton {...linkButton} />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 shrink-0">
                        標題
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {headingItems.map((item, index) => (
                        <DropdownMenuItem key={index} onClick={item.onClick}>
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )
}

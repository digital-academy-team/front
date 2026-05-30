// Polished drag-and-drop file picker.
//
// Replaces the default "Choose file / No file chosen" browser input
// across the app. The native input is hidden visually but still gets
// the file event (so accessibility + autofill still work).

import { useId, useRef, useState } from 'react';
import { File as FileIcon, Upload, X } from 'lucide-react';
import { cn } from './utils';

export interface FileInputProps {
  /** Comma-separated accept string, same as native input. */
  accept?: string;
  /** Currently selected file (controlled). */
  value?: File | null;
  /** URL of an already-uploaded file (shown as a small "current file" chip). */
  existingUrl?: string | null;
  existingLabel?: string;
  onChange: (file: File | null) => void;
  /** Localised hint shown when no file is picked, e.g. "MP4, MOV, MKV up to 200 MB". */
  hint?: string;
  /** Override the dropzone label. */
  label?: string;
  disabled?: boolean;
  className?: string;
  /** "video" | "image" | "doc" | etc. — drives the icon + accent. */
  variant?: 'video' | 'image' | 'doc' | 'any';
  /** Multi-file mode: collect several files instead of one. */
  multiple?: boolean;
  /** Selected files (multi mode). */
  values?: File[];
  onValuesChange?: (files: File[]) => void;
}

const VARIANT_ACCENT: Record<NonNullable<FileInputProps['variant']>, string> = {
  video: 'text-violet-500 bg-violet-500/10 ring-violet-500/30',
  image: 'text-sky-500 bg-sky-500/10 ring-sky-500/30',
  doc: 'text-amber-500 bg-amber-500/10 ring-amber-500/30',
  any: 'text-indigo-500 bg-indigo-500/10 ring-indigo-500/30',
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileInput({
  accept,
  value,
  existingUrl,
  existingLabel,
  onChange,
  hint,
  label,
  disabled,
  className,
  variant = 'any',
  multiple,
  values,
  onValuesChange,
}: FileInputProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const accent = VARIANT_ACCENT[variant];

  const handleFiles = (files: FileList | null) => {
    if (disabled) return;
    if (multiple) {
      const incoming = Array.from(files ?? []);
      if (!incoming.length) return;
      const merged = [...(values ?? [])];
      for (const f of incoming) {
        if (!merged.some((x) => x.name === f.name && x.size === f.size)) merged.push(f);
      }
      onValuesChange?.(merged);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange(files?.[0] ?? null);
  };

  if (multiple) {
    const list = values ?? [];
    return (
      <div className={cn('w-full space-y-2', className)}>
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={cn(
            'group relative flex items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all',
            'border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300',
            'dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-indigo-500/60',
            dragOver && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg ring-1 ring-inset', accent)}>
            <Upload className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {label ?? 'Drop files here or click to add'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hint ? `${hint} · ` : ''}You can add several.
            </p>
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple
            disabled={disabled}
            onChange={(e) => handleFiles(e.target.files)}
            className="sr-only"
          />
        </label>
        {list.length > 0 && (
          <ul className="space-y-1.5">
            {list.map((f, i) => (
              <li
                key={`${f.name}-${f.size}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
              >
                <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="flex-1 truncate text-sm text-slate-900 dark:text-slate-100">{f.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{humanSize(f.size)}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onValuesChange?.(list.filter((_, j) => j !== i)); }}
                  className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'group relative flex items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all',
          'border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300',
          'dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 dark:hover:border-indigo-500/60',
          dragOver && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('inline-flex items-center justify-center w-10 h-10 rounded-lg ring-1 ring-inset', accent)}>
          {value ? <FileIcon className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
        </span>
        <div className="flex-1 min-w-0">
          {value ? (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{value.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{humanSize(value.size)} · click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {label ?? 'Drop a file here or click to browse'}
              </p>
              {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
            </>
          )}
        </div>
        {value && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
      </label>

      {!value && existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <FileIcon className="w-3.5 h-3.5" />
          {existingLabel ?? 'Current file'}
        </a>
      )}
    </div>
  );
}

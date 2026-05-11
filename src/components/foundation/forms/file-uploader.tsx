"use client";

import { useId, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  accept?: string;
  helperText?: string;
  className?: string;
  onFileSelect?: (file: File) => void;
};

export function FileUploader({
  accept = ".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg",
  helperText = "Click to browse a document.",
  className,
  onFileSelect,
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function setSelectedFile(file: File) {
    setFileName(file.name);
    onFileSelect?.(file);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/40",
          isDragOver && "border-primary/60 bg-primary/5"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          const droppedFile = event.dataTransfer.files?.[0];
          if (droppedFile) {
            setSelectedFile(droppedFile);
          }
        }}
      >
        <Upload className="mb-2 size-5 text-primary" />
        <p className="text-sm font-medium">Upload supporting document</p>
        <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        {fileName ? <p className="mt-3 text-xs font-medium text-foreground">Selected: {fileName}</p> : null}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          if (selectedFile) {
            setSelectedFile(selectedFile);
          }
        }}
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        Choose File
      </Button>
    </div>
  );
}


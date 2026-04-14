import { useRef } from "react";
import { Upload } from "lucide-react";

type PhotoUploadButtonProps = {
  label: string;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  selectedFileName?: string | null;
  className?: string;
};

export function PhotoUploadButton({
  label,
  onFileSelect,
  accept = "image/*",
  selectedFileName,
  className = "",
}: PhotoUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={`photo-upload ${className}`.trim()}>
      <input
        ref={inputRef}
        className="photo-upload__input"
        type="file"
        accept={accept}
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        className="photo-upload__button"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="photo-upload__icon h-5 w-5" aria-hidden="true" />
        <span className="photo-upload__label">{label}</span>
      </button>

      {selectedFileName ? (
        <small className="photo-upload__filename">{selectedFileName}</small>
      ) : null}
    </div>
  );
}





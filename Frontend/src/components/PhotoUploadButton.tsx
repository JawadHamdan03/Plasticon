import { useRef } from "react";

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          viewBox="0 0 24 24"
          height="24"
          fill="none"
          className="photo-upload__icon"
        >
          <g
            strokeWidth="2"
            strokeLinecap="round"
            stroke="#fff"
            fillRule="evenodd"
            clipRule="evenodd"
          >
            <path d="m4 9c0-1.10457.89543-2 2-2h2l.44721-.89443c.33879-.67757 1.03131-1.10557 1.78889-1.10557h3.5278c.7576 0 1.4501.428 1.7889 1.10557l.4472.89443h2c1.1046 0 2 .89543 2 2v8c0 1.1046-.8954 2-2 2h-12c-1.10457 0-2-.8954-2-2z" />
            <path d="m15 13c0 1.6569-1.3431 3-3 3s-3-1.3431-3-3 1.3431-3 3-3 3 1.3431 3 3z" />
          </g>
        </svg>
        <span className="photo-upload__label">{label}</span>
      </button>

      {selectedFileName ? (
        <small className="photo-upload__filename">{selectedFileName}</small>
      ) : null}
    </div>
  );
}

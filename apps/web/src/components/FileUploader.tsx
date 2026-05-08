import { useId, type ChangeEvent } from 'react';

export interface FileUploaderProps {
  label: string;
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileUploader({
  label,
  onFile,
  accept = 'application/json,.json',
  disabled = false,
}: FileUploaderProps) {
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };

  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-brand-500"
    >
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
      />
    </label>
  );
}

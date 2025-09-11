// Simple wrapper to maintain backward compatibility while using the portable component
import { PortableInputBox, type PortableInputBoxProps } from './PortableInputBox';

interface InputBoxProps extends Omit<PortableInputBoxProps, 'leftControls' | 'rightControls'> {
  // Legacy props that are now ignored for simplicity
  mode?: string;
  onModeChange?: (mode: string) => void;
  autoDetectMode?: boolean;
}

export function InputBox({
  value,
  onChange,
  placeholder = "How can I help you today?",
  className = "",
  onFileUpload,
  onSubmit,
  // Legacy props ignored for simplicity
  mode,
  onModeChange,
  autoDetectMode,
  ...props
}: InputBoxProps) {
  return (
    <PortableInputBox
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      onFileUpload={onFileUpload}
      placeholder={placeholder}
      className={className}
      data-testid="input-main"
      {...props}
    />
  );
}
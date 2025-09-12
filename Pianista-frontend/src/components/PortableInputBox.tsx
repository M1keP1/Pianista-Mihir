import { useState, useRef, useEffect, useCallback } from 'react';

// Embedded CSS styles for complete portability
const PORTABLE_INPUT_BOX_STYLES = `
.pib-container {
  position: relative;
  width: 100%;
}

.pib-input-wrapper {
  position: relative;
  border-radius: 24px;
  border: 1px solid var(--pib-border, #e2e8f0);
  background: var(--pib-bg, #ffffff);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.pib-input-wrapper:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.pib-input-wrapper.pib-drag-over {
  border-color: var(--pib-primary, #3b82f6);
  background: var(--pib-primary-bg, rgba(59, 130, 246, 0.05));
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.pib-textarea {
  width: 100%;
  min-height: 120px;
  max-height: 400px;
  resize: none;
  border: none;
  background: transparent;
  padding: 24px 24px 80px 24px;
  font-size: 16px;
  line-height: 1.5;
  color: var(--pib-text, #1f2937);
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  font-family: inherit;
}

.pib-textarea::placeholder {
  color: var(--pib-placeholder, #9ca3af);
}

.pib-textarea::-webkit-scrollbar {
  width: 6px;
}

.pib-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.pib-textarea::-webkit-scrollbar-thumb {
  background: var(--pib-scrollbar, rgba(156, 163, 175, 0.3));
  border-radius: 3px;
}

.pib-textarea::-webkit-scrollbar-thumb:hover {
  background: var(--pib-scrollbar-hover, rgba(156, 163, 175, 0.5));
}

.pib-controls {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pib-left-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pib-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  padding: 0;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--pib-muted, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pib-button:hover {
  background: var(--pib-muted-bg, rgba(107, 114, 128, 0.1));
  color: var(--pib-text, #1f2937);
}

.pib-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pib-button.pib-primary {
  background: var(--pib-primary, #3b82f6);
  color: white;
}

.pib-button.pib-primary:hover:not(:disabled) {
  background: var(--pib-primary-hover, #2563eb);
}

.pib-button.pib-primary:disabled {
  background: var(--pib-muted-bg, #f3f4f6);
  color: var(--pib-muted, #6b7280);
}

.pib-drag-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  background: var(--pib-primary-bg, rgba(59, 130, 246, 0.1));
  backdrop-filter: blur(4px);
}

.pib-drag-overlay-content {
  text-align: center;
  color: var(--pib-primary, #3b82f6);
}

.pib-drag-overlay-text {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 500;
}

.pib-hidden {
  display: none;
}

.pib-mode-selector {
  position: relative;
  display: inline-block;
}

.pib-mode-button {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: var(--pib-muted, #6b7280);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.pib-mode-button:hover {
  background: var(--pib-muted-bg, rgba(107, 114, 128, 0.1));
  color: var(--pib-text, #1f2937);
}

.pib-mode-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  min-width: 160px;
  margin-top: 4px;
  background: var(--pib-bg, #ffffff);
  border: 1px solid var(--pib-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.pib-mode-option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--pib-text, #1f2937);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.pib-mode-option:hover {
  background: var(--pib-muted-bg, rgba(107, 114, 128, 0.1));
}

.pib-mode-option.pib-selected {
  background: var(--pib-primary-bg, rgba(59, 130, 246, 0.1));
  color: var(--pib-primary, #3b82f6);
  font-weight: 500;
}

.pib-mode-auto-indicator {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--pib-muted, #6b7280);
}

.pib-mode-auto-indicator span {
  font-weight: 500;
  color: var(--pib-text, #1f2937);
}

@media (prefers-color-scheme: dark) {
  .pib-input-wrapper {
    --pib-border: #374151;
    --pib-bg: #1f2937;
    --pib-text: #f9fafb;
    --pib-placeholder: #6b7280;
    --pib-muted: #9ca3af;
    --pib-muted-bg: rgba(156, 163, 175, 0.1);
    --pib-scrollbar: rgba(156, 163, 175, 0.3);
    --pib-scrollbar-hover: rgba(156, 163, 175, 0.5);
  }
}
`;

// Inline SVG icons
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Mode detection logic
type ProcessingMode = 'AI' | 'Domain' | 'Domain+Problem' | 'Mermaid';

function detectProcessingMode(text: string): ProcessingMode {
  const normalizedText = text.toLowerCase().trim();
  
  // Mermaid detection (highest priority)
  if (normalizedText.includes('graph ') ||
      normalizedText.includes('flowchart ') ||
      normalizedText.includes('sequencediagram') ||
      normalizedText.includes('gantt') ||
      normalizedText.includes('classDiagram') ||
      normalizedText.includes('stateDiagram') ||
      normalizedText.includes('erDiagram') ||
      normalizedText.includes('journey') ||
      normalizedText.includes('pie ') ||
      normalizedText.includes('mindmap') ||
      normalizedText.match(/\b(-->|==>|-.->)\b/)) {
    return 'Mermaid';
  }
  
  // Domain+Problem detection
  if ((normalizedText.includes('domain') && normalizedText.includes('problem')) ||
      normalizedText.includes('pddl') ||
      normalizedText.match(/\b(action|predicate|effect|precondition|goal|init)\b/)) {
    return 'Domain+Problem';
  }
  
  // Domain detection
  if (normalizedText.includes('domain') ||
      normalizedText.match(/\b(types|constants|predicates|functions|durative-action)\b/)) {
    return 'Domain';
  }
  
  // Default to AI for general queries
  return 'AI';
}

// Custom hooks for functionality
function useAutoResizeTextarea(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, { minHeight = 120, maxHeight = 400 } = {}) {
  useEffect(() => {
    const textarea = ref.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, minHeight, maxHeight]);
}

function useDragAndDrop({ onFile, accept = ['.txt', '.md', '.mmd', '.mermaid', '.pddl'] }: {
  onFile?: (content: string, filename: string) => void;
  accept?: string[];
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const isValidFile = useCallback((file: File) => {
    return file.type.startsWith('text/') || 
           accept.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));
  }, [accept]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && isValidFile(file) && onFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFile(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [onFile, isValidFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return { isDragOver, handleDrop, handleDragOver, handleDragLeave, isValidFile };
}

function useFileReader({ onContent }: { onContent?: (content: string, filename: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (onContent) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onContent(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [onContent]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return { fileInputRef, handleFileInputChange, openFileDialog, handleFileSelect };
}

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (!stylesInjected && typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.id = 'portable-input-box-css';
    styleElement.textContent = PORTABLE_INPUT_BOX_STYLES;
    document.head.appendChild(styleElement);
    stylesInjected = true;
  }
}

export interface PortableInputBoxProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  onFileUpload?: (content: string, filename: string) => void;
  placeholder?: string;
  showUpload?: boolean;
  leftControls?: React.ReactNode;
  rightControls?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
  accept?: string[];
  maxSize?: number;
  // Mode selection props
  showModeSelector?: boolean;
  mode?: ProcessingMode;
  onModeChange?: (mode: ProcessingMode) => void;
  autoDetectMode?: boolean;
}

export function PortableInputBox({
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSubmit,
  onFileUpload,
  placeholder = 'How can I help you today?',
  showUpload = true,
  leftControls,
  rightControls,
  className = '',
  style,
  'data-testid': testId,
  accept = ['.txt', '.md', '.mmd', '.mermaid', '.pddl'],
  showModeSelector = true,
  mode: controlledMode,
  onModeChange,
  autoDetectMode = true,
}: PortableInputBoxProps) {
  // Inject styles on component mount
  useEffect(() => {
    injectStyles();
  }, []);

  // Handle controlled/uncontrolled state for value
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  
  // Handle controlled/uncontrolled state for mode
  const [internalMode, setInternalMode] = useState<ProcessingMode>('AI');
  const isModeControlled = controlledMode !== undefined;
  const currentMode = isModeControlled ? controlledMode : internalMode;
  
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-detect mode when text changes
  useEffect(() => {
    if (autoDetectMode && value.trim()) {
      const detectedMode = detectProcessingMode(value);
      if (detectedMode !== currentMode) {
        if (!isModeControlled) {
          setInternalMode(detectedMode);
        }
        onModeChange?.(detectedMode);
      }
    }
  }, [value, autoDetectMode, currentMode, isModeControlled, onModeChange]);

  // Custom hooks
  useAutoResizeTextarea(textareaRef, value);
  const { isDragOver, handleDrop, handleDragOver, handleDragLeave } = useDragAndDrop({
    onFile: onFileUpload,
    accept,
  });
  const { fileInputRef, handleFileInputChange, openFileDialog } = useFileReader({
    onContent: onFileUpload,
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleSubmit = () => {
    if (onSubmit && value.trim()) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUploadClick = () => {
    if (showUpload) {
      openFileDialog();
    }
  };

  const handleModeSelect = (mode: ProcessingMode) => {
    if (!isModeControlled) {
      setInternalMode(mode);
    }
    onModeChange?.(mode);
    setShowModeDropdown(false);
  };

  const toggleModeDropdown = () => {
    setShowModeDropdown(!showModeDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (showModeDropdown && !target.closest('.pib-mode-selector')) {
        setShowModeDropdown(false);
      }
    };
    
    if (showModeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showModeDropdown]);

  return (
    <div className={`pib-container ${className}`} style={style} data-testid={testId}>
      <div 
        className={`pib-input-wrapper ${isDragOver ? 'pib-drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          ref={textareaRef}
          data-testid={testId ? `${testId}-textarea` : 'portable-input-textarea'}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pib-textarea"
        />
        
        <div className="pib-controls">
          <div className="pib-left-controls">
            {showUpload && (
              <button
                data-testid={testId ? `${testId}-upload` : 'portable-input-upload'}
                className="pib-button"
                onClick={handleFileUploadClick}
                type="button"
              >
                <PlusIcon />
              </button>
            )}
            {showModeSelector && (
              <div className="pib-mode-selector">
                <button
                  data-testid={testId ? `${testId}-mode-selector` : 'portable-input-mode-selector'}
                  className="pib-mode-button"
                  onClick={toggleModeDropdown}
                  type="button"
                >
                  {currentMode}
                  <ChevronDownIcon />
                </button>
                {showModeDropdown && (
                  <div className="pib-mode-dropdown">
                    {(['AI', 'Domain', 'Domain+Problem', 'Mermaid'] as ProcessingMode[]).map((mode) => (
                      <button
                        key={mode}
                        data-testid={testId ? `${testId}-mode-option-${mode}` : `portable-input-mode-option-${mode}`}
                        className={`pib-mode-option ${mode === currentMode ? 'pib-selected' : ''}`}
                        onClick={() => handleModeSelect(mode)}
                        type="button"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {leftControls}
          </div>

          <div>
            {rightControls}
            <button
              data-testid={testId ? `${testId}-submit` : 'portable-input-submit'}
              className="pib-button pib-primary"
              onClick={handleSubmit}
              disabled={!value.trim()}
              type="button"
            >
              <ArrowUpIcon />
            </button>
          </div>
        </div>

        {isDragOver && (
          <div className="pib-drag-overlay">
            <div className="pib-drag-overlay-content">
              <PlusIcon />
              <p className="pib-drag-overlay-text">Drop file to upload</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(',')}
        onChange={handleFileInputChange}
        className="pib-hidden"
      />
      
      {/* Subtle mode indicator */}
      {autoDetectMode && showModeSelector && (
        <div className="pib-mode-auto-indicator">
          Mode auto-detected: <span>{currentMode}</span>
        </div>
      )}
    </div>
  );
}

export default PortableInputBox;
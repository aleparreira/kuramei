import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Download, Loader2, FileWarning, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileTree, buildFileTree } from './FileTree';
import { CodePreview } from './CodePreview';
import {
  validateTerraform,
  generateTerraform,
  type TerraformFile,
  type TerraformValidationResult,
  type ApiError,
} from '@/lib/api';

interface ExportModalProps {
  modelId: string;
  isOpen: boolean;
  onClose: () => void;
}

type ExportState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'validation-failed'; result: TerraformValidationResult }
  | { status: 'generating' }
  | { status: 'ready'; files: TerraformFile[]; warnings: string[] }
  | { status: 'error'; message: string };

export function ExportModal({ modelId, isOpen, onClose }: ExportModalProps) {
  const [state, setState] = useState<ExportState>({ status: 'idle' });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState({ status: 'idle' });
      setSelectedFile(null);
    }
  }, [isOpen]);

  // Start validation when modal opens
  useEffect(() => {
    if (isOpen && state.status === 'idle') {
      validateAndGenerate();
    }
  }, [isOpen, state.status]);

  const validateAndGenerate = useCallback(async () => {
    setState({ status: 'validating' });

    try {
      // Step 1: Validate
      const validation = await validateTerraform(modelId);

      if (!validation.valid) {
        setState({ status: 'validation-failed', result: validation });
        return;
      }

      // Step 2: Generate (if validation passed)
      setState({ status: 'generating' });

      const result = await generateTerraform(modelId);

      setState({
        status: 'ready',
        files: result.files,
        warnings: result.warnings,
      });

      // Auto-select first file
      if (result.files.length > 0) {
        setSelectedFile(result.files[0].path);
      }
    } catch (error) {
      const apiError = error as ApiError;
      const message =
        typeof apiError.detail === 'object' && apiError.detail !== null
          ? (apiError.detail as { message?: string }).message || 'Generation failed'
          : apiError.message || 'An unexpected error occurred';
      setState({ status: 'error', message });
    }
  }, [modelId]);

  const handleDownloadZip = useCallback(async () => {
    if (state.status !== 'ready') return;

    setIsDownloading(true);
    try {
      const zip = new JSZip();

      for (const file of state.files) {
        zip.file(file.path, file.content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'terraform-export.zip');
    } catch (error) {
      console.error('Failed to create ZIP:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [state]);

  const handleRetry = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const selectedFileContent =
    state.status === 'ready'
      ? state.files.find((f) => f.path === selectedFile)?.content ?? ''
      : '';

  const selectedFileName = selectedFile?.split('/').pop() ?? '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">
            Export Terraform
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Preview and download Terraform configuration files for your architecture.
          </DialogDescription>
        </DialogHeader>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {/* Loading states */}
          {(state.status === 'validating' || state.status === 'generating') && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {state.status === 'validating'
                  ? 'Validating model...'
                  : 'Generating Terraform files...'}
              </p>
            </div>
          )}

          {/* Validation failed */}
          {state.status === 'validation-failed' && (
            <div className="h-full flex flex-col p-6 overflow-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-destructive/10">
                  <FileWarning className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Validation Failed
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please fix the following issues before exporting.
                  </p>
                </div>
              </div>

              {/* Errors */}
              {state.result.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-destructive mb-2">
                    Errors ({state.result.errors.length})
                  </h4>
                  <div className="space-y-2">
                    {state.result.errors.map((error, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-md"
                      >
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <span className="font-medium">{error.node_name}: </span>
                          <span className="text-muted-foreground">
                            {error.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {state.result.warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mb-2">
                    Warnings ({state.result.warnings.length})
                  </h4>
                  <div className="space-y-2">
                    {state.result.warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-md"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <span className="font-medium">{warning.node_name}: </span>
                          <span className="text-muted-foreground">
                            {warning.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {state.status === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground mb-1">
                  Export Failed
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {state.message}
                </p>
              </div>
              <Button variant="outline" onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          )}

          {/* Ready state - file preview */}
          {state.status === 'ready' && (
            <div className="h-full flex">
              {/* File tree */}
              <div className="w-64 border-r border-border overflow-auto bg-muted/20">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      {state.files.length} file{state.files.length !== 1 ? 's' : ''} ready
                    </span>
                  </div>
                </div>
                <FileTree
                  files={buildFileTree(state.files)}
                  selectedPath={selectedFile}
                  onSelect={setSelectedFile}
                />

                {/* Warnings section */}
                {state.warnings.length > 0 && (
                  <div className="p-3 border-t border-border">
                    <h4 className="text-xs font-medium text-yellow-600 dark:text-yellow-500 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Warnings
                    </h4>
                    <div className="space-y-1">
                      {state.warnings.map((warning, i) => (
                        <p
                          key={i}
                          className="text-xs text-muted-foreground leading-relaxed"
                        >
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Code preview */}
              <div className="flex-1 overflow-hidden bg-card">
                {selectedFile ? (
                  <CodePreview
                    filename={selectedFileName}
                    content={selectedFileContent}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Select a file to preview
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {state.status === 'ready' && (
            <Button onClick={handleDownloadZip} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating ZIP...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download ZIP
                </>
              )}
            </Button>
          )}
          {state.status === 'validation-failed' && (
            <Button variant="outline" onClick={handleRetry}>
              Retry Validation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

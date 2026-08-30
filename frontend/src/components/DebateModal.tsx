"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface DebateModalProps {
  open: boolean;
  bull: string;
  bear: string;
  synthesis: string;
  isStreaming: boolean;
  onClose: () => void;
}

export function DebateModal({
  open,
  bull,
  bear,
  synthesis,
  isStreaming,
  onClose,
}: DebateModalProps) {
  const bullDone = !isStreaming || bear.length > 0 || synthesis.length > 0;
  const bearDone = !isStreaming || synthesis.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0"
        showCloseButton
      >
        <DialogHeader className="shrink-0 px-6 py-4 border-b border-border space-y-0 bg-muted/30">
          <DialogTitle>Investment debate</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 bg-background space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-primary font-normal flex items-center gap-2">
                  Bull case
                  {isStreaming && !bullDone && <Spinner className="w-3 h-3" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {bull || (isStreaming ? "" : "—")}
                </p>
              </CardContent>
            </Card>

            <Card className={cn("border-muted-foreground/30")}>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal flex items-center gap-2">
                  Bear case
                  {isStreaming && bullDone && !bearDone && <Spinner className="w-3 h-3" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {bear || (isStreaming ? "" : "—")}
                </p>
              </CardContent>
            </Card>
          </div>

          {(synthesis || (isStreaming && bearDone)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal flex items-center gap-2">
                  Synthesis
                  {isStreaming && bearDone && !synthesis && <Spinner className="w-3 h-3" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{synthesis}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BriefingMarkdown } from "@/components/BriefingMarkdown";
import { Spinner } from "@/components/ui/spinner";
import { downloadBriefingPdf } from "@/lib/briefing-pdf";
import { FileDown } from "lucide-react";

interface DocumentModalProps {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  loading?: boolean;
}

export function DocumentModal({
  open,
  title,
  content,
  onClose,
  loading,
}: DocumentModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-0 gap-0"
        showCloseButton
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between px-6 py-4 border-b border-border space-y-0 bg-muted/30">
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadBriefingPdf(content)}
            className="mr-8"
          >
            <FileDown data-icon="inline-start" />
            Download PDF
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 bg-background">
          {loading && !content ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Spinner className="w-6 h-6 text-primary" />
              Drafting...
            </div>
          ) : (
            <BriefingMarkdown content={content} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

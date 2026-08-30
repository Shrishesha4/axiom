"use client";

import { DocumentModal } from "@/components/DocumentModal";

interface BriefingModalProps {
  open: boolean;
  content: string;
  onClose: () => void;
}

export function BriefingModal({ open, content, onClose }: BriefingModalProps) {
  return (
    <DocumentModal open={open} title="Executive briefing" content={content} onClose={onClose} />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Send } from "lucide-react";
import { AgentTrace } from "./AgentTrace";
import { explainSignals, streamAskFollowup, getInvestigation } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import type { FollowUp, Signal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AgentPanelProps {
  investigationId: number;
  signals: Signal[];
  traceSteps: { step: string; status: string; message: string; timestamp?: string }[];
  isRunning: boolean;
  savedFollowups?: FollowUp[];
  onHighlight?: (mechanism: string) => void;
}

type LiveMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "sending" | "sent" | "streaming" | "complete" | "error";
};

function followupsToMessages(followups: FollowUp[]): LiveMessage[] {
  const messages: LiveMessage[] = [];
  for (const item of followups) {
    messages.push({
      id: `user-${item.id}`,
      role: "user",
      content: item.question,
      status: "sent",
    });
    messages.push({
      id: `assistant-${item.id}`,
      role: "assistant",
      content: item.answer,
      status: "complete",
    });
  }
  return messages;
}

export function AgentPanel({
  investigationId,
  signals,
  traceSteps,
  isRunning,
  savedFollowups = [],
  onHighlight,
}: AgentPanelProps) {
  const { refreshUser } = useAuth();
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [followup, setFollowup] = useState("");
  const [messages, setMessages] = useState<LiveMessage[]>(() =>
    followupsToMessages(savedFollowups)
  );
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(followupsToMessages(savedFollowups));
  }, [savedFollowups]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, explanation, traceSteps]);

  const handleExplain = async () => {
    setIsExplaining(true);
    setExplanation("");
    const stream = await explainSignals(investigationId);
    if (!stream) {
      setExplanation("Unable to generate explanation.");
      setIsExplaining(false);
      return;
    }
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setExplanation((prev) => prev + decoder.decode(value));
    }
    setIsExplaining(false);
    refreshUser();
  };

  const handleAsk = async (question?: string) => {
    const q = (question || followup).trim();
    if (!q || isAsking) return;

    const userId = `live-user-${Date.now()}`;
    const assistantId = `live-assistant-${Date.now()}`;

    setFollowup("");
    setIsAsking(true);
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: q, status: "sending" },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);

    if (q.toLowerCase().includes("underserved")) {
      onHighlight?.("Tau");
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, status: "sent" } : m))
    );

    await streamAskFollowup(
      investigationId,
      q,
      (event) => {
        if (event.type === "delta") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.content } : m
            )
          );
        }
        if (event.type === "tool") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content
                      ? `${m.content}\n\n_${event.message}…_`
                      : `_${event.message}…_`,
                    status: "streaming",
                  }
                : m
            )
          );
        }
      },
      async () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, status: "complete" } : m
          )
        );
        setIsAsking(false);
        try {
          const inv = await getInvestigation(investigationId);
          setMessages(followupsToMessages(inv.followups || []));
        } catch {
          // keep local messages if refresh fails
        }
        refreshUser();
      },
      (err) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === userId) return { ...m, status: "sent" };
            if (m.id === assistantId) {
              return {
                ...m,
                content: err.message || "Unable to get response.",
                status: "error",
              };
            }
            return m;
          })
        );
        setIsAsking(false);
      }
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" ref={scrollRef}>
        <div className="space-y-5 pb-4">
          <AgentTrace steps={traceSteps} isRunning={isRunning} />

          {!isRunning && signals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Signals ({signals.length})
              </p>
              {signals.map((s) => (
                <Card key={s.id} size="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{s.title}</CardTitle>
                    <CardDescription className="text-xs">{s.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
              <Button
                onClick={handleExplain}
                disabled={isExplaining}
                className="w-full"
                variant="outline"
              >
                {isExplaining ? "Loading..." : "Explain"}
              </Button>
            </motion.div>
          )}

          {explanation && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card size="sm">
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pt-4">
                  {explanation}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {messages.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Follow-up
              </p>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[95%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-border"
                    )}
                  >
                    {msg.content || (msg.status === "streaming" ? "..." : "")}
                  </div>
                  {msg.role === "user" && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 px-1">
                      {msg.status === "sending" && (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Sending
                        </>
                      )}
                      {msg.status === "sent" && (
                        <>
                          <Check className="w-3 h-3 text-primary" />
                          Sent
                        </>
                      )}
                    </span>
                  )}
                  {msg.role === "assistant" && msg.status === "streaming" && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 px-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Responding
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isRunning && (
        <div className="shrink-0 border-t border-border bg-card/80 pt-3 mt-2">
          <div className="flex gap-2 mb-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleAsk("Which areas look underserved?")}
              disabled={isAsking}
            >
              Underserved areas
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isAsking && handleAsk()}
              placeholder="Ask a follow-up question..."
              className="flex-1"
              disabled={isAsking}
            />
            <Button
              onClick={() => handleAsk()}
              disabled={isAsking || !followup.trim()}
              size="icon"
              variant="default"
            >
              {isAsking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiState } from "@/hooks/use-ai-state";

export default function ChatWidgetButton() {
    const { setChatOpen } = useAiState();
    return (
        <Button
            size="icon"
            variant="ghost"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-accent hover:bg-accent/90"
            onClick={() => setChatOpen(true)}
        >
            <Bot className="h-7 w-7" />
        </Button>
    )
}
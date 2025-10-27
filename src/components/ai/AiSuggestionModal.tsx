'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAiState } from '@/hooks/use-ai-state';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb, Tag, Package } from 'lucide-react';

export default function AiSuggestionModal() {
  const { suggestion, clearSuggestion } = useAiState();
  const { toast } = useToast();

  const handleApply = () => {
    // This is a stub for now. In a real app, this would trigger a backend action.
    toast({
      title: 'Suggestion Applied (Stub)',
      description: `The action "${suggestion?.title}" would be applied now.`,
    });
    clearSuggestion();
  };

  const handleClose = () => {
    clearSuggestion();
  };

  if (!suggestion) {
    return null;
  }

  return (
    <Dialog open={!!suggestion} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="text-accent" />
            AI Suggestion
          </DialogTitle>
          <DialogDescription>{suggestion.title}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">{suggestion.description}</p>

          {suggestion.items && suggestion.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Related Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestion.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                    <span>{item.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Dismiss
          </Button>
          <Button onClick={handleApply}>
            <Tag className="mr-2 h-4 w-4" />
            Apply Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

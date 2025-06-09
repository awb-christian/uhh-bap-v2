
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { LogEntry } from "@/lib/app-logger";
import { Copy } from "lucide-react";

interface LogDetailsModalProps {
  log: LogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LogDetailsModal({ log, isOpen, onClose }: LogDetailsModalProps) {
  const { toast } = useToast();

  if (!log) {
    return null;
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(log.message)
      .then(() => {
        toast({
          title: "Copied to clipboard!",
          description: "The log message has been copied.",
        });
      })
      .catch(err => {
        toast({
          title: "Copy failed",
          description: "Could not copy the message to clipboard.",
          variant: "destructive",
        });
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Details</DialogTitle>
          <DialogDescription>
            Detailed information for the selected log entry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="timestamp" className="text-right">
              Timestamp
            </Label>
            <Input id="timestamp" value={new Date(log.timestamp).toLocaleString()} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="source" className="text-right">
              Source
            </Label>
            <Input id="source" value={log.source} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Input id="status" value={log.status} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right pt-2">
              Message
            </Label>
            <ScrollArea className="col-span-3 h-48 rounded-md border">
              <Textarea
                id="message"
                value={log.message}
                readOnly
                className="h-full resize-none border-0 focus-visible:ring-0 p-2"
              />
            </ScrollArea>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
           <Button variant="outline" onClick={handleCopyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Message
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

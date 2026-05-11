"use client";

import { getThreads } from "@app/actions/threads";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { groupByDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export type ChatSearchProps = ComponentProps<typeof Dialog>;

export function ChatSearch({ onOpenChange, ...props }: ChatSearchProps) {
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["threads"], queryFn: getThreads });
  const threads = data?.threads ?? [];
  const groupedThreads = groupByDate(threads, (t) => t.updatedAt);

  const handleSelect = (threadId: string) => {
    onOpenChange?.(false, undefined as never);
    router.push(`/c/${threadId}`);
  };

  return (
    <Dialog onOpenChange={onOpenChange} {...props}>
      <DialogContent
        aria-describedby={undefined}
        className={cn("outline! border-none! p-0 outline-border! outline-solid!")}
      >
        <DialogTitle className="sr-only">Search streams</DialogTitle>
        <Command className="**:data-[slot=command-input-wrapper]:h-auto">
          <CommandInput placeholder="Search streams..." className="h-auto py-3.5" />
          <CommandList>
            <CommandEmpty>No streams found.</CommandEmpty>
            {groupedThreads.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((thread) => (
                  <CommandItem
                    key={thread.id}
                    value={thread.title ?? thread.id}
                    onSelect={() => handleSelect(thread.id)}
                  >
                    {thread.title ?? "Untitled chat"}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export type ChatSearchTriggerProps = ComponentProps<typeof DialogTrigger>;

export const ChatSearchTrigger = (props: ChatSearchTriggerProps) => <DialogTrigger {...props} />;

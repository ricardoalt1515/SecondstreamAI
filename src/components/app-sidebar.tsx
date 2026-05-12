"use client";

import { cloneThread, deleteThread, getThreads, type Thread } from "@app/actions/threads";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, GitBranch, LogOut, Search, Settings, SquarePen, X } from "lucide-react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type * as React from "react";
import { useState } from "react";
import { ChatSearch } from "@/components/chat-search";
import { OpenChatLogo } from "@/components/openchat-logo";
import { SettingsDialog } from "@/components/settings-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { groupByDate } from "@/lib/date-utils";

type SidebarActionItem = {
  id: "new-chat" | "search-chats";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SIDEBAR_ACTIONS: ReadonlyArray<SidebarActionItem> = [
  {
    id: "new-chat",
    label: "New stream",
    icon: SquarePen,
  },
  {
    id: "search-chats",
    label: "Search streams",
    icon: Search,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>): React.JSX.Element {
  const router = useRouter();
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<Thread | null>(null);
  const params = useParams<{ threadId?: string }>();
  const activeThreadId = params?.threadId;
  const { data } = useQuery({ queryKey: ["threads"], queryFn: getThreads });
  const threads = data?.threads ?? [];
  const groupedThreads = groupByDate(threads, (t) => t.updatedAt);

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => deleteThread({ threadId }),
    onMutate: async (threadId) => {
      await queryClient.cancelQueries({ queryKey: ["threads"] });

      const previous = queryClient.getQueryData<{ threads: Thread[] }>(["threads"]);

      queryClient.setQueryData<{ threads: Thread[] }>(["threads"], (old) => {
        if (!old) return { threads: [] };
        return {
          threads: old.threads.filter((t) => t.id !== threadId),
        };
      });

      return { previous };
    },
    onError: (_err, _threadId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["threads"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const branchThreadMutation = useMutation({
    mutationFn: (sourceThreadId: string) => cloneThread({ sourceThreadId }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      router.push(`/c/${result.thread.id}`);
    },
  });

  const handleDeleteConfirm = () => {
    if (!threadToDelete) return;

    const isActive = threadToDelete.id === activeThreadId;
    deleteThreadMutation.mutate(threadToDelete.id);
    setThreadToDelete(null);

    if (isActive) {
      router.push("/");
    }
  };

  const handleAction = (actionId: SidebarActionItem["id"]) => {
    if (actionId === "new-chat") {
      router.push(`/?new=${nanoid()}`);
    } else if (actionId === "search-chats") {
      setSearchOpen(true);
    }
  };

  const displayName = user?.signInDetails?.loginId ?? user?.username ?? "Signed in";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = () => {
    signOut();
    queryClient.clear();
    router.push("/login");
  };

  return (
    <>
      <ChatSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="px-3 pt-3 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <OpenChatLogo className="h-8 w-auto max-w-[160px] shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:max-w-[120px]" />
            <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarHeader>

        <SidebarGroup className="pt-1">
          <SidebarMenu>
            {SIDEBAR_ACTIONS.map((action: SidebarActionItem) => {
              const ActionIcon: React.ComponentType<{ className?: string }> = action.icon;

              return (
                <SidebarMenuItem key={action.id}>
                  <SidebarMenuButton
                    tooltip={action.label}
                    type="button"
                    aria-label={action.label}
                    onClick={() => handleAction(action.id)}
                  >
                    <ActionIcon className="size-5 shrink-0" />
                    <span>{action.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarContent>
          {groupedThreads.length > 0 ? (
            groupedThreads.map((group) => (
              <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:hidden">
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarMenu>
                  {group.items.map((thread) => (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton
                        render={<Link href={`/c/${thread.id}`} />}
                        isActive={thread.id === activeThreadId}
                        aria-label={thread.title ?? "Untitled stream"}
                      >
                        <span>{thread.title ?? "Untitled stream"}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        className="right-6"
                        aria-label="Branch stream"
                        onClick={(e) => {
                          e.preventDefault();
                          branchThreadMutation.mutate(thread.id);
                        }}
                      >
                        <GitBranch className="size-4" />
                      </SidebarMenuAction>
                      <SidebarMenuAction
                        showOnHover
                        aria-label="Delete stream"
                        onClick={(e) => {
                          e.preventDefault();
                          setThreadToDelete(thread);
                        }}
                      >
                        <X className="size-4" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            ))
          ) : (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarMenu>
                <p className="text-muted-foreground px-2 py-1 text-xs">No streams yet</p>
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="border-sidebar-border border-t p-3 group-data-[collapsible=icon]:px-0">
          <SidebarMenu>
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                    />
                  }
                >
                  <div className="bg-orange-500 text-white flex size-9 shrink-0 aspect-square items-center justify-center rounded-full text-lg font-medium group-data-[collapsible=icon]:size-7 group-data-[collapsible=icon]:text-base">
                    {initials}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      Private workspace
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
      <AlertDialog
        open={threadToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setThreadToDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stream</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this stream and all its messages. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

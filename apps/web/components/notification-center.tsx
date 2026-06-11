"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, ExternalLink, Info, Loader2, X, XCircle } from "lucide-react";

const STORAGE_KEY = "somniacos.notifications";
const MAX_ITEMS = 50;
const TOAST_AUTO_DISMISS_MS = 6000;

export type NotificationKind = "result" | "tx" | "error" | "info";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: { href: string; label: string };
  resultRequestId?: string;
  createdAt: number;
  read: boolean;
};

type NotificationContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  push: (input: Omit<NotificationItem, "id" | "createdAt" | "read"> & { silent?: boolean }) => string;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  onViewResult: (handler: (requestId: string) => void) => () => void;
  triggerView: (requestId: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider.");
  return ctx;
}

function loadItems(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function persistItems(items: NotificationItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Quota exceeded — ignore.
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [toastQueue, setToastQueue] = useState<NotificationItem[]>([]);
  const viewHandlersRef = useRef<Set<(id: string) => void>>(new Set());
  const hydratedRef = useRef(false);

  useEffect(() => {
    setItems(loadItems());
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (hydratedRef.current) persistItems(items);
  }, [items]);

  const push: NotificationContextValue["push"] = useCallback((input) => {
    const item: NotificationItem = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      kind: input.kind,
      title: input.title,
      body: input.body,
      link: input.link,
      resultRequestId: input.resultRequestId,
      createdAt: Date.now(),
      read: false
    };
    setItems((prev) => [item, ...prev].slice(0, MAX_ITEMS));
    if (!input.silent) {
      setToastQueue((prev) => [...prev, item]);
    }
    return item.id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setToastQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setToastQueue([]);
  }, []);

  const onViewResult = useCallback((handler: (requestId: string) => void) => {
    viewHandlersRef.current.add(handler);
    return () => {
      viewHandlersRef.current.delete(handler);
    };
  }, []);

  const triggerView = useCallback((requestId: string) => {
    for (const handler of viewHandlersRef.current) {
      try {
        handler(requestId);
      } catch {
        // Handler can throw; we still call the others.
      }
    }
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({
    items,
    unreadCount: items.filter((item) => !item.read).length,
    push,
    dismiss,
    markRead,
    markAllRead,
    clearAll,
    onViewResult,
    triggerView
  }), [items, push, dismiss, markRead, markAllRead, clearAll, onViewResult, triggerView]);

  const removeFromQueue = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack toasts={toastQueue} onDismiss={removeFromQueue} onViewResult={triggerView} markRead={markRead} />
    </NotificationContext.Provider>
  );
}

function ToastStack({
  toasts,
  onDismiss,
  onViewResult,
  markRead
}: {
  toasts: NotificationItem[];
  onDismiss: (id: string) => void;
  onViewResult: (requestId: string) => void;
  markRead: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.slice(-4).map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          onView={
            toast.kind === "result" && toast.resultRequestId
              ? () => {
                  markRead(toast.id);
                  onViewResult(toast.resultRequestId!);
                  onDismiss(toast.id);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss, onView }: { toast: NotificationItem; onDismiss: () => void; onView?: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, TOAST_AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [onDismiss]);
  const palette = paletteForKind(toast.kind);
  return (
    <div className={`pointer-events-auto overflow-hidden rounded-2xl border ${palette.border} ${palette.bg} shadow-lg backdrop-blur`}>
      <div className="flex items-start gap-3 p-3">
        <KindIcon kind={toast.kind} className={palette.icon} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{toast.title}</p>
          {toast.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">{toast.body}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {onView ? (
              <button onClick={onView} className="rounded-lg border border-signal/50 bg-signal/10 px-2 py-1 text-xs font-semibold text-signal hover:bg-signal/20">View result</button>
            ) : null}
            {toast.link ? (
              <a href={toast.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-xs text-white/70 hover:text-white">
                <ExternalLink className="h-3 w-3" />{toast.link.label}
              </a>
            ) : null}
          </div>
        </div>
        <button onClick={onDismiss} className="rounded-lg p-1 text-white/45 hover:bg-white/5 hover:text-white" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BellButton() {
  const { items, unreadCount, markAllRead, dismiss, clearAll, triggerView } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    setOpen((value) => {
      const next = !value;
      if (next) markAllRead();
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-signal/40 hover:text-signal"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl sm:w-[360px]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/45">
            <span>Notifications</span>
            {items.length ? (
              <button onClick={clearAll} className="text-[11px] uppercase tracking-[0.2em] text-white/45 hover:text-white">Clear all</button>
            ) : null}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-white/45">No notifications yet. Run an agent and the result will appear here.</p>
            ) : (
              items.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  onDismiss={() => dismiss(item.id)}
                  onView={
                    item.kind === "result" && item.resultRequestId
                      ? () => {
                          triggerView(item.resultRequestId!);
                          setOpen(false);
                        }
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InboxRow({ item, onDismiss, onView }: { item: NotificationItem; onDismiss: () => void; onView?: () => void }) {
  const palette = paletteForKind(item.kind);
  return (
    <div className="group flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
      <KindIcon kind={item.kind} className={palette.icon} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{item.title}</p>
        {item.body ? <p className="mt-1 line-clamp-3 text-xs leading-5 text-white/55">{item.body}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-white/35">{formatRelative(item.createdAt)}</span>
          {onView ? (
            <button onClick={onView} className="rounded-md border border-signal/40 bg-signal/10 px-2 py-0.5 font-semibold text-signal hover:bg-signal/20">View result</button>
          ) : null}
          {item.link ? (
            <a href={item.link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/55 hover:text-white">
              <ExternalLink className="h-3 w-3" />{item.link.label}
            </a>
          ) : null}
        </div>
      </div>
      <button onClick={onDismiss} className="rounded-md p-1 text-white/30 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-white/5 hover:text-white" aria-label="Clear">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function KindIcon({ kind, className }: { kind: NotificationKind; className?: string }) {
  if (kind === "result") return <CheckCircle2 className={`h-4 w-4 shrink-0 ${className ?? ""}`} />;
  if (kind === "tx") return <Loader2 className={`h-4 w-4 shrink-0 animate-spin ${className ?? ""}`} />;
  if (kind === "error") return <XCircle className={`h-4 w-4 shrink-0 ${className ?? ""}`} />;
  return <Info className={`h-4 w-4 shrink-0 ${className ?? ""}`} />;
}

function paletteForKind(kind: NotificationKind) {
  if (kind === "result") return { border: "border-signal/30", bg: "bg-signal/10", icon: "text-signal" };
  if (kind === "error") return { border: "border-danger/30", bg: "bg-danger/10", icon: "text-danger" };
  if (kind === "tx") return { border: "border-cobalt/30", bg: "bg-cobalt/10", icon: "text-cobalt" };
  return { border: "border-white/10", bg: "bg-white/[0.04]", icon: "text-white/55" };
}

function formatRelative(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

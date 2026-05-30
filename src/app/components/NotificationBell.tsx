// In-app notification bell + dropdown.
//
// Shows an unread badge and a scrollable list of the current user's
// notifications. Works for both students and tutors. Uses the indigo brand
// palette + slate surfaces (the project's "new design").

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck, GraduationCap, Inbox, BellRing } from 'lucide-react';
import { useAuth } from '@/app/store/AuthContext';
import type { Notification } from '@/app/types';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function NotificationIcon({ type }: { type?: string }) {
  if (type === 'ASSIGNMENT_GRADED') {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30 shrink-0">
        <GraduationCap className="w-4 h-4" />
      </span>
    );
  }
  if (type === 'ASSIGNMENT_SUBMITTED') {
    return (
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/30 shrink-0">
        <Inbox className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-500/30 shrink-0">
      <BellRing className="w-4 h-4" />
    </span>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead, refreshNotifications } = useAuth();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refreshNotifications();
  };

  const handleItemClick = (n: Notification) => {
    if (!n.read) markNotificationRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors cursor-pointer"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell className="w-5 h-5" aria-hidden="true" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white dark:ring-slate-900"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden z-50"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {unread > 0 ? `${unread} unread` : 'You’re all caught up'}
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-500 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[24rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={[
                      'w-full flex items-start gap-3 px-4 py-3 text-left border-b last:border-0 border-slate-100 dark:border-slate-800/70 transition-colors cursor-pointer',
                      n.read
                        ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        : 'bg-indigo-50/60 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10',
                    ].join(' ')}
                  >
                    <NotificationIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      {n.title && (
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span aria-hidden="true" className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Images,
  CalendarCheck,
  Camera,
  Package,
  CalendarDays,
  Boxes,
  Wallet,
  FolderHeart,
  Settings,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logout } from "@/features/admin/actions";
import { StudioLogo } from "./studio-logo";
const nav = [
  ["Dashboard", "/admin", LayoutDashboard],
  ["Portfolio", "/admin/portfolio", Images],
  ["Bookings", "/admin/bookings", CalendarCheck],
  ["Rentals", "/admin/rentals", Camera],
  ["Equipment", "/admin/equipment", Package],
  ["Master Calendar", "/admin/calendar", CalendarDays],
  ["Inventory", "/admin/inventory", Boxes],
  ["Financial Records", "/admin/finances", Wallet],
  ["Event Galleries", "/admin/galleries", FolderHeart],
  ["Studio Settings", "/admin/settings", Settings],
] as const;
export function AdminSidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  function close() {
    setOpen(false);
    toggle.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current
      ?.querySelector<HTMLButtonElement>(".admin-drawer-close")
      ?.focus();
    const media = window.matchMedia("(min-width:801px)");
    const onWideScreen = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onWideScreen);
    return () => {
      document.body.style.overflow = previous;
      media.removeEventListener("change", onWideScreen);
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="admin-menu-toggle"
        ref={toggle}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="admin-navigation"
        aria-label="Open studio navigation"
      >
        <Menu size={22} />
      </button>
      {open && (
        <button
          type="button"
          className="admin-nav-backdrop"
          aria-label="Close studio navigation"
          onClick={close}
        />
      )}
      <aside
        id="admin-navigation"
        ref={drawer}
        className={`admin-sidebar ${open ? "is-open" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Studio navigation"
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
          }
          if (e.key === "Tab") {
            const nodes = Array.from(
              drawer.current?.querySelectorAll<HTMLElement>(
                "a[href],button:not([disabled])",
              ) ?? [],
            ).filter((x) => x.getClientRects().length > 0);
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <button
          type="button"
          className="admin-drawer-close"
          onClick={close}
          aria-label="Close studio navigation"
        >
          <X size={22} />
        </button>
        <div className="admin-brand">
          <StudioLogo href="/admin" onNavigate={() => setOpen(false)} />
          <span className="workspace-label">STUDIO MANAGEMENT</span>
        </div>
        <nav aria-label="Studio administration">
          {nav.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
              aria-current={path === href ? "page" : undefined}
              onClick={close}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            View website <ArrowUpRight size={16} />
          </Link>
          <form action={logout}>
            <button>
              <LogOut size={16} /> Sign out
            </button>
          </form>
          <span>Since 1982 · Ambalangoda</span>
        </div>
      </aside>
    </>
  );
}

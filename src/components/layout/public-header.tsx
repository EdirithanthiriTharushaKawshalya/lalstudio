"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StudioLogo } from "./studio-logo";
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open)
      navigation.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [open]);
  const path = usePathname();
  const links = [
    ["Home", "/"],
    ["Portfolio", "/portfolio"],
    ["Services", "/services"],
    ["About", "/about"],
    ["Camera Rentals", "/rentals"],
  ];
  return (
    <header
      className={`public-header ${path === "/" ? "on-hero" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <StudioLogo />
      <nav
        id="public-navigation"
        ref={navigation}
        className={open ? "open" : ""}
        aria-label="Main navigation"
      >
        {links.map(([name, href]) => (
          <Link
            aria-current={path === href ? "page" : undefined}
            href={href}
            key={href}
            onClick={() => setOpen(false)}
          >
            {name}
          </Link>
        ))}
        <Button
          href="/bookings"
          onNavigate={() => setOpen(false)}
          variant={path === "/" ? "light" : "primary"}
        >
          Book a Session <ArrowUpRight size={15} />
        </Button>
      </nav>
      <button
        className="menu-toggle"
        ref={menuButton}
        type="button"
        aria-controls="public-navigation"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close navigation" : "Open navigation"}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}

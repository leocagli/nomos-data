"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",            label: "Ledger"       },
  { href: "/orchestrate", label: "Run job"      },
  { href: "/register",    label: "Specialists"  },
  { href: "/inbox",       label: "Inbox"        },
  { href: "/assets",      label: "Assets"       },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <div style={{ display: "flex", gap: "2px", flex: 1 }}>
      {LINKS.map(({ href, label }) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              padding: "5px 11px",
              borderRadius: "8px",
              fontSize: "0.875rem",
              textDecoration: "none",
              color: active ? "var(--text)" : "var(--text-dim)",
              background: active ? "var(--bg-elev2)" : "transparent",
              fontWeight: active ? 500 : 400,
              transition: "color 0.12s, background 0.12s",
              letterSpacing: "-0.005em",
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

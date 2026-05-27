import Link from "next/link";
import Image from "next/image";
import { NavLinks } from "./NavLinks";
import { AuthDropdown } from "./AuthDropdown";
import { getCurrentUser } from "@/lib/auth";

export async function Nav() {
  const user = await getCurrentUser();

  return (
    <nav
      style={{
        borderBottom: "2px solid var(--ink)",
        background: "rgba(255,246,237,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6"
        style={{ height: "52px", display: "flex", alignItems: "center", gap: "24px" }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            flexShrink: 0,
            textDecoration: "none",
          }}
        >
          <Image src="/nomos-logo.svg" alt="Nomos" width={30} height={30} priority />
          <span
            className="font-nomos"
            style={{
              fontSize: "1.25rem",
              color: "var(--text)",
              lineHeight: 1,
              letterSpacing: "0.01em",
            }}
          >
            nomos
          </span>
          <span
            style={{
              fontSize: "0.625rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            arkiv ledger
          </span>
        </Link>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "18px",
            background: "var(--border)",
            flexShrink: 0,
          }}
        />

        {/* Links — client component for active-link highlighting */}
        <NavLinks />

        {/* Auth */}
        {user ? (
          <AuthDropdown user={user} />
        ) : (
          <Link
            href="/auth/login"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "5px 14px",
              borderRadius: "999px",
              background: "var(--accent)",
              border: "1px solid transparent",
              fontSize: "0.6875rem",
              fontFamily: "JetBrains Mono, monospace",
              color: "white",
              flexShrink: 0,
              letterSpacing: "0.02em",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Shell del dashboard: sidebar de navegacion + chequeo de sesion.
// El JWT vive en una cookie httpOnly -- no hay nada que leer del lado del
// cliente para saber si hay sesion, asi que lo unico que podemos hacer es
// pegarle a un endpoint protegido (/api/session/ping) y ver si responde 200
// o 401.

const NAV_ITEMS = [
  { href: "/activos", label: "Activos" },
  { href: "/contratos", label: "Contratos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/ingresos", label: "Ingresos" },
  { href: "/usuarios", label: "Usuarios" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/session/ping")
      .then(() => {
        if (cancelled) return;
        setAuthenticated(true);
        if (pathname === "/login") router.replace("/activos");
      })
      .catch(() => {
        if (cancelled) return;
        setAuthenticated(false);
        if (pathname !== "/login") router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  if (pathname === "/login") {
    return <div className="flex min-h-screen flex-col">{children}</div>;
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Verificando sesión...
      </div>
    );
  }

  if (!authenticated) {
    // El useEffect ya disparó el redirect a /login; esto es solo el frame
    // mientras el router navega.
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-4 px-2">
          <p className="text-sm font-semibold">Renting</p>
          <p className="text-xs text-neutral-500">Panel de operaciones</p>
        </div>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm ${
                active
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col gap-1">
          <Link
            href="/cuenta"
            className={`rounded px-3 py-2 text-sm ${
              pathname.startsWith("/cuenta")
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            Mi cuenta
          </Link>
          <button
            onClick={logout}
            className="rounded px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          {children}
        </div>
      </main>
    </div>
  );
}

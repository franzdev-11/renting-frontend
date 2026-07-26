"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createUsuario,
  deactivateUsuario,
  listUsuarios,
  listUsuariosInactivos,
  reactivateUsuario,
  resetPasswordUsuario,
  updateUsuario,
} from "@/lib/endpoints";
import type { UserResponse } from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

const ROLES = ["ADMIN", "USER"];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    rucDni: "",
    nombreCompleto: "",
    emailCorporativo: "",
    password: "",
    roles: ["USER"] as string[],
  });
  const [creating, setCreating] = useState(false);

  const [editando, setEditando] = useState<UserResponse | null>(null);
  const [editForm, setEditForm] = useState({
    nombreCompleto: "",
    emailCorporativo: "",
    roles: [] as string[],
  });

  const [reseteando, setReseteando] = useState<UserResponse | null>(null);
  const [resetForm, setResetForm] = useState({ newPassword: "", confirmPassword: "" });
  const [resetError, setResetError] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [activos, inactivos] = await Promise.all([
        listUsuarios(),
        listUsuariosInactivos().catch(() => []),
      ]);
      // El backend devuelve 204 sin body cuando una lista viene vacía;
      // apiFetch en ese caso resuelve con null/"" en vez de un array.
      const a = Array.isArray(activos) ? activos : [];
      const i = Array.isArray(inactivos) ? inactivos : [];
      setUsuarios([...a, ...i]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setEditando(null);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleRole(list: string[], role: string): string[] {
    return list.includes(role) ? list.filter((r) => r !== role) : [...list, role];
  }

  function abrirEdicion(u: UserResponse) {
    setEditando(u);
    setEditForm({
      nombreCompleto: u.nombreCompleto,
      emailCorporativo: u.emailCorporativo,
      roles: u.roles ?? [],
    });
  }

  function abrirReset(u: UserResponse) {
    setReseteando(u);
    setResetError(null);
    setResetForm({ newPassword: "", confirmPassword: "" });
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!reseteando) return;
    setResetError(null);

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetError("La contraseña nueva y su confirmación no coinciden");
      return;
    }

    setBusy(true);
    try {
      await resetPasswordUsuario(reseteando.id, { newPassword: resetForm.newPassword });
      setReseteando(null);
    } catch (e) {
      setResetError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createUsuario(form);
      setForm({
        rucDni: "",
        nombreCompleto: "",
        emailCorporativo: "",
        password: "",
        roles: ["USER"],
      });
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <p className="text-sm text-neutral-500">
        Administración de cuentas del sistema (requiere rol ADMIN).
      </p>
      <ErrorBanner message={error} />

      <Card title="Usuarios registrados">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              {
                header: "Nombre",
                render: (u: UserResponse) => u.nombreCompleto,
              },
              {
                header: "Email",
                render: (u: UserResponse) => u.emailCorporativo,
              },
              {
                header: "Roles",
                render: (u: UserResponse) => (u.roles ?? []).join(", ") || "—",
              },
              {
                header: "Estado",
                render: (u: UserResponse) => <Badge value={u.activo ?? true} />,
              },
              {
                header: "Acciones",
                render: (u: UserResponse) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => abrirEdicion(u)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => abrirReset(u)}>
                      Resetear contraseña
                    </Button>
                    {u.activo === false ? (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() => run(() => reactivateUsuario(u.id))}
                      >
                        Reactivar
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        loading={busy}
                        onClick={() => run(() => deactivateUsuario(u.id))}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={usuarios}
            keyFn={(u) => u.id}
            emptyLabel="Todavía no hay usuarios registrados"
          />
        )}
      </Card>

      {editando && (
        <Card
          title={`Editar usuario: ${editando.nombreCompleto}`}
          action={
            <Button variant="ghost" onClick={() => setEditando(null)}>
              Cerrar
            </Button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateUsuario(editando.id, editForm));
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Nombre completo">
              <input
                className={inputClass}
                value={editForm.nombreCompleto}
                onChange={(e) =>
                  setEditForm({ ...editForm, nombreCompleto: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Email corporativo">
              <input
                type="email"
                className={inputClass}
                value={editForm.emailCorporativo}
                onChange={(e) =>
                  setEditForm({ ...editForm, emailCorporativo: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Roles">
              <div className="flex gap-4 pt-1">
                {ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.roles.includes(r)}
                      onChange={() =>
                        setEditForm({ ...editForm, roles: toggleRole(editForm.roles, r) })
                      }
                    />
                    {r}
                  </label>
                ))}
              </div>
            </Field>
            <Button type="submit" loading={busy}>
              Guardar cambios
            </Button>
          </form>
        </Card>
      )}

      {reseteando && (
        <Card
          title={`Resetear contraseña: ${reseteando.nombreCompleto}`}
          description="No hace falta la contraseña actual. Al confirmar, se cierra cualquier sesión que ese usuario tuviera abierta."
          action={
            <Button variant="ghost" onClick={() => setReseteando(null)}>
              Cerrar
            </Button>
          }
        >
          <ErrorBanner message={resetError} />
          <form onSubmit={handleReset} className="flex max-w-sm flex-col gap-3">
            <Field label="Contraseña nueva">
              <input
                type="password"
                className={inputClass}
                value={resetForm.newPassword}
                onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirmar contraseña nueva">
              <input
                type="password"
                className={inputClass}
                value={resetForm.confirmPassword}
                onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </Field>
            <Button type="submit" loading={busy}>
              Resetear contraseña
            </Button>
          </form>
        </Card>
      )}

      <Card title="Nuevo usuario">
        <form onSubmit={handleCrear} className="flex flex-col gap-3">
          <Field label="Nombre completo">
            <input
              className={inputClass}
              value={form.nombreCompleto}
              onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
              required
            />
          </Field>
          <Field label="Email corporativo">
            <input
              type="email"
              className={inputClass}
              value={form.emailCorporativo}
              onChange={(e) => setForm({ ...form, emailCorporativo: e.target.value })}
              required
            />
          </Field>
          <Field label="RUC / DNI">
            <input
              className={inputClass}
              value={form.rucDni}
              onChange={(e) => setForm({ ...form, rucDni: e.target.value })}
              required
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field label="Roles">
            <div className="flex gap-4 pt-1">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(r)}
                    onChange={() => setForm({ ...form, roles: toggleRole(form.roles, r) })}
                  />
                  {r}
                </label>
              ))}
            </div>
          </Field>
          <Button type="submit" loading={creating}>
            Crear usuario
          </Button>
        </form>
      </Card>
    </div>
  );
}

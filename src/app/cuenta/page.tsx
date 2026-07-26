"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { changePassword } from "@/lib/endpoints";
import { Button, Card, ErrorBanner, Field, inputClass } from "@/components/ui";

export default function CuentaPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("La contraseña nueva y su confirmación no coinciden");
      return;
    }

    setBusy(true);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Contraseña actualizada.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Mi cuenta</h1>
      <ErrorBanner message={error} />
      {success && (
        <div className="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {success}
        </div>
      )}

      <Card
        title="Cambiar contraseña"
        description="Cambia solo la tuya. Al confirmar, se cierra la sesión en cualquier otro dispositivo donde hayas iniciado sesión (esta pantalla sigue funcionando normal)."
      >
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
          <Field label="Contraseña actual">
            <input
              type="password"
              className={inputClass}
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="Contraseña nueva">
            <input
              type="password"
              className={inputClass}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar contraseña nueva">
            <input
              type="password"
              className={inputClass}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" loading={busy}>
            Cambiar contraseña
          </Button>
        </form>
      </Card>
    </div>
  );
}

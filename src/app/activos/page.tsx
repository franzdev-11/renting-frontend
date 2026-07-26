"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import {
  listActivos,
  listActivosInactivos,
  listTipos,
  registrarIngresoConActivoNuevo,
} from "@/lib/endpoints";
import type { ActivoResponse, TipoProductoResponse } from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

export default function ActivosPage() {
  const [activos, setActivos] = useState<ActivoResponse[]>([]);
  const [tipos, setTipos] = useState<TipoProductoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    codigoInterno: "",
    descripcion: "",
    tipoProductoId: "",
    proveedor: "",
    costo: "",
    moneda: "USD",
  });
  const [creating, setCreating] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [a, ai, t] = await Promise.all([
        listActivos(),
        listActivosInactivos().catch(() => []),
        listTipos(),
      ]);
      setActivos([...a, ...ai]);
      setTipos(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function nombreTipo(id: number) {
    return tipos.find((t) => t.id === id)?.nombre ?? `#${id}`;
  }

  async function handleRegistrarIngreso(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await registrarIngresoConActivoNuevo({
        tipoIngreso: "compra",
        proveedor: form.proveedor || undefined,
        items: [
          {
            codigoInterno: form.codigoInterno,
            descripcion: form.descripcion || undefined,
            tipoProductoId: Number(form.tipoProductoId),
            estadoOperativo: "disponible",
            costo: form.costo ? Number(form.costo) : undefined,
            moneda: form.costo ? form.moneda : undefined,
          },
        ],
      });
      setForm({
        codigoInterno: "",
        descripcion: "",
        tipoProductoId: "",
        proveedor: "",
        costo: "",
        moneda: "USD",
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
      <h1 className="text-xl font-semibold">Activos</h1>
      <ErrorBanner message={error} />

      <Card title="Activos registrados">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              {
                header: "Código",
                render: (a: ActivoResponse) => (
                  <Link
                    href={`/activos/${a.idActivo}`}
                    className="font-medium hover:underline"
                  >
                    {a.codigoInterno}
                  </Link>
                ),
              },
              {
                header: "Descripción",
                render: (a: ActivoResponse) => a.descripcion ?? "—",
              },
              {
                header: "Tipo",
                render: (a: ActivoResponse) => a.tipoProductoNombre ?? "—",
              },
              {
                header: "Estado operativo",
                render: (a: ActivoResponse) => <Badge value={a.estadoOperativo} />,
              },
              {
                header: "Activo",
                render: (a: ActivoResponse) => <Badge value={a.activo ?? true} />,
              },
            ]}
            rows={activos}
            keyFn={(a) => a.idActivo}
          />
        )}
      </Card>

      <Card
        title="Registrar ingreso de un activo nuevo"
        description='Esto es "desde que llega el activo": crea el activo y lo registra en un documento de ingreso en un solo paso.'
      >
        <form onSubmit={handleRegistrarIngreso} className="flex flex-col gap-3">
          <Field label="Código interno">
            <input
              className={inputClass}
              value={form.codigoInterno}
              onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })}
              required
            />
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </Field>
          <Field label="Tipo de producto">
            <select
              className={inputClass}
              value={form.tipoProductoId}
              onChange={(e) => setForm({ ...form, tipoProductoId: e.target.value })}
              required
            >
              <option value="" disabled>
                {tipos.length === 0
                  ? "Primero crea un tipo de producto en Catálogo"
                  : "Selecciona un tipo"}
              </option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Proveedor (opcional)">
            <input
              className={inputClass}
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
            />
          </Field>
          <Field label="Costo (opcional)">
            <input
              type="number"
              className={inputClass}
              value={form.costo}
              onChange={(e) => setForm({ ...form, costo: e.target.value })}
            />
          </Field>
          <Button type="submit" loading={creating} disabled={tipos.length === 0}>
            Registrar ingreso
          </Button>
        </form>
      </Card>
    </div>
  );
}

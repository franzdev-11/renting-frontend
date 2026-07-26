"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import {
  createContrato,
  listActivos,
  listClientes,
  listContratos,
  listContratosInactivos,
  listResponsablesByCliente,
} from "@/lib/endpoints";
import type {
  ActivoResponse,
  ClienteResponse,
  ContratoResponse,
  ResponsableResponse,
} from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoResponse[]>([]);
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [activos, setActivos] = useState<ActivoResponse[]>([]);
  const [responsables, setResponsables] = useState<ResponsableResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    contratoCodigo: "",
    idCliente: "",
    idActivo: "",
    idResponsable: "",
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFinPrevista: "",
    tipoTarifa: "MENSUAL" as
      | "DIARIO"
      | "SEMANAL"
      | "MENSUAL"
      | "TRIMESTRAL"
      | "SEMESTRAL"
      | "ANUAL",
    precioBase: "",
    moneda: "USD" as "PEN" | "USD",
    diaFacturacion: "5",
  });

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [c, ci, cl, a] = await Promise.all([
        listContratos(),
        listContratosInactivos().catch(() => []),
        listClientes(),
        listActivos(),
      ]);
      setContratos([...c, ...ci]);
      setClientes(cl);
      setActivos(a);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!form.idCliente) {
      setResponsables([]);
      return;
    }
    listResponsablesByCliente(Number(form.idCliente))
      .then(setResponsables)
      .catch(() => setResponsables([]));
  }, [form.idCliente]);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createContrato({
        contratoCodigo: form.contratoCodigo,
        idCliente: Number(form.idCliente),
        fechaInicio: form.fechaInicio,
        fechaFinPrevista: form.fechaFinPrevista || undefined,
        detalles: [
          {
            idActivo: Number(form.idActivo),
            idResponsable: form.idResponsable ? Number(form.idResponsable) : undefined,
            tipoTarifa: form.tipoTarifa,
            precioBase: Number(form.precioBase),
            moneda: form.moneda,
            diaFacturacion: Number(form.diaFacturacion),
            fechaInicioAlquiler: form.fechaInicio,
          },
        ],
      });
      setForm({ ...form, contratoCodigo: "", idActivo: "", precioBase: "" });
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Contratos</h1>
      <ErrorBanner message={error} />

      <Card title="Contratos registrados">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              {
                header: "Código",
                render: (c: ContratoResponse) => (
                  <Link
                    href={`/contratos/${c.idContrato}`}
                    className="font-medium hover:underline"
                  >
                    {c.contratoCodigo}
                  </Link>
                ),
              },
              {
                header: "Cliente",
                render: (c: ContratoResponse) => c.clienteRazonSocial ?? "—",
              },
              {
                header: "Vigente",
                render: (c: ContratoResponse) => <Badge value={c.vigente} />,
              },
              {
                header: "Activos",
                render: (c: ContratoResponse) => c.detalles?.length ?? 0,
              },
            ]}
            rows={contratos}
            keyFn={(c) => c.idContrato}
          />
        )}
      </Card>

      <Card
        title="Nuevo contrato"
        description="Alquila un activo disponible a un cliente. Puedes agregar más activos después desde la ficha del contrato."
      >
        <form onSubmit={handleCrear} className="flex flex-col gap-3">
          <Field label="Código de contrato">
            <input
              className={inputClass}
              value={form.contratoCodigo}
              onChange={(e) => setForm({ ...form, contratoCodigo: e.target.value })}
              required
            />
          </Field>
          <Field label="Cliente">
            <select
              className={inputClass}
              value={form.idCliente}
              onChange={(e) =>
                setForm({ ...form, idCliente: e.target.value, idResponsable: "" })
              }
              required
            >
              <option value="" disabled>
                Selecciona un cliente
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable (opcional)">
            <select
              className={inputClass}
              value={form.idResponsable}
              onChange={(e) => setForm({ ...form, idResponsable: e.target.value })}
              disabled={!form.idCliente}
            >
              <option value="">Sin responsable</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombreCompleto}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Activo">
            <select
              className={inputClass}
              value={form.idActivo}
              onChange={(e) => setForm({ ...form, idActivo: e.target.value })}
              required
            >
              <option value="" disabled>
                Selecciona un activo
              </option>
              {activos.map((a) => (
                <option key={a.idActivo} value={a.idActivo}>
                  {a.codigoInterno} ({a.estadoOperativo ?? "sin estado"})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de inicio">
            <input
              type="date"
              className={inputClass}
              value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              required
            />
          </Field>
          <Field label="Tipo de tarifa">
            <select
              className={inputClass}
              value={form.tipoTarifa}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipoTarifa: e.target.value as
                    | "DIARIO"
                    | "SEMANAL"
                    | "MENSUAL"
                    | "TRIMESTRAL"
                    | "SEMESTRAL"
                    | "ANUAL",
                })
              }
            >
              <option value="DIARIO">DIARIO</option>
              <option value="SEMANAL">SEMANAL</option>
              <option value="MENSUAL">MENSUAL</option>
              <option value="TRIMESTRAL">TRIMESTRAL</option>
              <option value="SEMESTRAL">SEMESTRAL</option>
              <option value="ANUAL">ANUAL</option>
            </select>
          </Field>
          <Field label="Precio base">
            <input
              type="number"
              className={inputClass}
              value={form.precioBase}
              onChange={(e) => setForm({ ...form, precioBase: e.target.value })}
              required
            />
          </Field>
          <Field label="Moneda">
            <select
              className={inputClass}
              value={form.moneda}
              onChange={(e) =>
                setForm({ ...form, moneda: e.target.value as "PEN" | "USD" })
              }
            >
              <option value="USD">USD</option>
              <option value="PEN">PEN</option>
            </select>
          </Field>
          <Button type="submit" loading={creating}>
            Crear contrato
          </Button>
        </form>
      </Card>
    </div>
  );
}

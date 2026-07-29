"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  agregarDetalleIngreso,
  listActivos,
  listIngresos,
  registrarIngresoConActivoExistente,
  updateIngreso,
} from "@/lib/endpoints";
import type { ActivoResponse, IngresoActivoResponse } from "@/lib/types";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Table,
  TipoIngresoField,
  inputClass,
} from "@/components/ui";

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<IngresoActivoResponse[]>([]);
  const [activos, setActivos] = useState<ActivoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [seleccionado, setSeleccionado] = useState<IngresoActivoResponse | null>(null);
  const [editForm, setEditForm] = useState({
    tipoIngreso: "",
    ordenCompra: "",
    proveedor: "",
    numeroDocumento: "",
    fechaIngreso: "",
    observacion: "",
  });
  const [detalleForm, setDetalleForm] = useState({
    idActivo: "",
    costo: "",
    moneda: "USD",
    sede: "",
    area: "",
    detalle: "",
  });

  const [nuevoForm, setNuevoForm] = useState({
    idActivo: "",
    tipoIngreso: "compra",
    proveedor: "",
    numeroDocumento: "",
    costo: "",
    moneda: "USD",
    sede: "",
    area: "",
    detalle: "",
  });
  const [creating, setCreating] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [i, a] = await Promise.all([listIngresos(), listActivos()]);
      setIngresos(i);
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

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function abrirGestion(i: IngresoActivoResponse) {
    setSeleccionado(i);
    setEditForm({
      tipoIngreso: i.tipoIngreso ?? "",
      ordenCompra: "",
      proveedor: i.proveedor ?? "",
      numeroDocumento: i.numeroDocumento ?? "",
      fechaIngreso: i.fechaIngreso ?? "",
      observacion: i.observacion ?? "",
    });
  }

  function nombreActivo(id: number) {
    return activos.find((a) => a.idActivo === id)?.codigoInterno ?? `#${id}`;
  }

  async function handleCrearNuevo(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await registrarIngresoConActivoExistente({
        tipoIngreso: nuevoForm.tipoIngreso,
        proveedor: nuevoForm.proveedor || undefined,
        numeroDocumento: nuevoForm.numeroDocumento || undefined,
        detalles: [
          {
            idActivo: Number(nuevoForm.idActivo),
            costo: nuevoForm.costo ? Number(nuevoForm.costo) : undefined,
            moneda: nuevoForm.costo ? nuevoForm.moneda : undefined,
            sede: nuevoForm.sede,
            area: nuevoForm.area,
            detalle: nuevoForm.detalle || undefined,
          },
        ],
      });
      setNuevoForm({
        idActivo: "",
        tipoIngreso: "compra",
        proveedor: "",
        numeroDocumento: "",
        costo: "",
        moneda: "USD",
        sede: "",
        area: "",
        detalle: "",
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
      <h1 className="text-xl font-semibold">Ingresos</h1>
      <p className="text-sm text-neutral-500">
        El documento de ingreso agrupa uno o más activos con su costo, proveedor y orden de
        compra. "Registrar ingreso de un activo nuevo" (en Activos) crea el activo y el
        documento en un solo paso; aquí puedes revisar, editar y agregar activos ya
        existentes a un documento de ingreso.
      </p>
      <ErrorBanner message={error} />

      <Card title="Ingresos registrados">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              { header: "#", render: (i: IngresoActivoResponse) => i.idIngreso },
              {
                header: "Tipo",
                render: (i: IngresoActivoResponse) => i.tipoIngreso ?? "—",
              },
              {
                header: "Proveedor",
                render: (i: IngresoActivoResponse) => i.proveedor ?? "—",
              },
              {
                header: "N° documento",
                render: (i: IngresoActivoResponse) => i.numeroDocumento ?? "—",
              },
              {
                header: "Fecha",
                render: (i: IngresoActivoResponse) => i.fechaIngreso ?? "—",
              },
              {
                header: "Activos",
                render: (i: IngresoActivoResponse) => {
                  const detalles = i.detalles ?? [];
                  if (detalles.length === 0) return 0;
                  const codigos = detalles.map((d) => d.codigoInternoActivo);
                  const visibles = codigos.slice(0, 3).join(", ");
                  const resto = codigos.length - 3;
                  return resto > 0 ? `${visibles} (+${resto} más)` : visibles;
                },
              },
              {
                header: "",
                render: (i: IngresoActivoResponse) => (
                  <Button variant="ghost" onClick={() => abrirGestion(i)}>
                    Gestionar
                  </Button>
                ),
              },
            ]}
            rows={ingresos}
            keyFn={(i) => i.idIngreso}
            emptyLabel="Todavía no hay ingresos registrados"
          />
        )}
      </Card>

      {seleccionado && (
        <Card
          title={`Ingreso #${seleccionado.idIngreso}`}
          action={
            <Button variant="ghost" onClick={() => setSeleccionado(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-sm font-medium">Activos de este ingreso</p>
              <Table
                columns={[
                  {
                    header: "Activo",
                    render: (d) => d.codigoInternoActivo ?? nombreActivo(d.idActivo),
                  },
                  { header: "Costo", render: (d) => d.costo ?? "—" },
                  { header: "Moneda", render: (d) => d.moneda ?? "—" },
                ]}
                rows={seleccionado.detalles}
                keyFn={(d) => d.idDetalleIngreso}
                emptyLabel="Sin activos en este ingreso"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => updateIngreso(seleccionado.idIngreso, editForm));
              }}
              className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
            >
              <p className="text-sm font-medium">Editar datos del ingreso</p>
              <TipoIngresoField
                value={editForm.tipoIngreso}
                onChange={(v) => setEditForm({ ...editForm, tipoIngreso: v })}
              />
              <Field label="Proveedor">
                <input
                  className={inputClass}
                  value={editForm.proveedor}
                  onChange={(e) => setEditForm({ ...editForm, proveedor: e.target.value })}
                />
              </Field>
              <Field label="N° documento">
                <input
                  className={inputClass}
                  value={editForm.numeroDocumento}
                  onChange={(e) =>
                    setEditForm({ ...editForm, numeroDocumento: e.target.value })
                  }
                />
              </Field>
              <Field label="Fecha de ingreso">
                <input
                  type="date"
                  className={inputClass}
                  value={editForm.fechaIngreso}
                  onChange={(e) => setEditForm({ ...editForm, fechaIngreso: e.target.value })}
                />
              </Field>
              <Field label="Observación">
                <input
                  className={inputClass}
                  value={editForm.observacion}
                  onChange={(e) => setEditForm({ ...editForm, observacion: e.target.value })}
                />
              </Field>
              <Button type="submit" loading={busy}>
                Guardar cambios
              </Button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  agregarDetalleIngreso(seleccionado.idIngreso, {
                    idActivo: Number(detalleForm.idActivo),
                    costo: detalleForm.costo ? Number(detalleForm.costo) : undefined,
                    moneda: detalleForm.costo ? detalleForm.moneda : undefined,
                    sede: detalleForm.sede,
                    area: detalleForm.area,
                    detalle: detalleForm.detalle || undefined,
                  }).then(() =>
                    setDetalleForm({
                      idActivo: "",
                      costo: "",
                      moneda: "USD",
                      sede: "",
                      area: "",
                      detalle: "",
                    })
                  )
                );
              }}
              className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
            >
              <p className="text-sm font-medium">Agregar otro activo (ya existente) a este ingreso</p>
              <Field label="Activo">
                <select
                  className={inputClass}
                  value={detalleForm.idActivo}
                  onChange={(e) => setDetalleForm({ ...detalleForm, idActivo: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Selecciona un activo
                  </option>
                  {activos.map((a) => (
                    <option key={a.idActivo} value={a.idActivo}>
                      {a.codigoInterno}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Costo">
                <input
                  type="number"
                  className={inputClass}
                  value={detalleForm.costo}
                  onChange={(e) => setDetalleForm({ ...detalleForm, costo: e.target.value })}
                />
              </Field>
              <Field label="Sede">
                <input
                  className={inputClass}
                  value={detalleForm.sede}
                  onChange={(e) => setDetalleForm({ ...detalleForm, sede: e.target.value })}
                  required
                />
              </Field>
              <Field label="Área">
                <input
                  className={inputClass}
                  value={detalleForm.area}
                  onChange={(e) => setDetalleForm({ ...detalleForm, area: e.target.value })}
                  required
                />
              </Field>
              <Field label="Detalle (opcional)">
                <input
                  className={inputClass}
                  value={detalleForm.detalle}
                  onChange={(e) => setDetalleForm({ ...detalleForm, detalle: e.target.value })}
                />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>
                Agregar activo al ingreso
              </Button>
            </form>
          </div>
        </Card>
      )}

      <Card
        title="Registrar ingreso de un activo ya existente"
        description="A diferencia de 'ingreso con activo nuevo' (en Activos), aquí el activo ya está creado y solo se documenta su ingreso (compra, reposición, etc)."
      >
        <form onSubmit={handleCrearNuevo} className="flex flex-col gap-3">
          <Field label="Activo">
            <select
              className={inputClass}
              value={nuevoForm.idActivo}
              onChange={(e) => setNuevoForm({ ...nuevoForm, idActivo: e.target.value })}
              required
            >
              <option value="" disabled>
                Selecciona un activo
              </option>
              {activos.map((a) => (
                <option key={a.idActivo} value={a.idActivo}>
                  {a.codigoInterno}
                </option>
              ))}
            </select>
          </Field>
          <TipoIngresoField
            value={nuevoForm.tipoIngreso}
            onChange={(v) => setNuevoForm({ ...nuevoForm, tipoIngreso: v })}
          />
          <Field label="Proveedor (opcional)">
            <input
              className={inputClass}
              value={nuevoForm.proveedor}
              onChange={(e) => setNuevoForm({ ...nuevoForm, proveedor: e.target.value })}
            />
          </Field>
          <Field label="N° documento (opcional)">
            <input
              className={inputClass}
              value={nuevoForm.numeroDocumento}
              onChange={(e) => setNuevoForm({ ...nuevoForm, numeroDocumento: e.target.value })}
            />
          </Field>
          <Field label="Costo (opcional)">
            <input
              type="number"
              className={inputClass}
              value={nuevoForm.costo}
              onChange={(e) => setNuevoForm({ ...nuevoForm, costo: e.target.value })}
            />
          </Field>
          <Field label="Sede">
            <input
              className={inputClass}
              value={nuevoForm.sede}
              onChange={(e) => setNuevoForm({ ...nuevoForm, sede: e.target.value })}
              required
            />
          </Field>
          <Field label="Área">
            <input
              className={inputClass}
              value={nuevoForm.area}
              onChange={(e) => setNuevoForm({ ...nuevoForm, area: e.target.value })}
              required
            />
          </Field>
          <Field label="Detalle (opcional)">
            <input
              className={inputClass}
              value={nuevoForm.detalle}
              onChange={(e) => setNuevoForm({ ...nuevoForm, detalle: e.target.value })}
            />
          </Field>
          <Button type="submit" loading={creating} disabled={activos.length === 0}>
            Registrar ingreso
          </Button>
        </form>
      </Card>
    </div>
  );
}

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
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Field,
  Table,
  TipoIngresoField,
  inputClass,
} from "@/components/ui";

export default function ActivosPage() {
  const [activos, setActivos] = useState<ActivoResponse[]>([]);
  const [tipos, setTipos] = useState<TipoProductoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filaVacia = {
    codigoInterno: "",
    descripcion: "",
    tipoProductoId: "",
    costo: "",
    moneda: "USD",
    sede: "",
    area: "",
    detalle: "",
  };

  const [form, setForm] = useState({
    tipoIngreso: "compra",
    ordenCompra: "",
    numeroDocumento: "",
    proveedor: "",
    sede: "",
    area: "",
    detalle: "",
  });
  const [items, setItems] = useState([{ ...filaVacia }]);
  const [creating, setCreating] = useState(false);

  function actualizarFila(idx: number, cambios: Partial<typeof filaVacia>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));
  }

  function agregarFila() {
    setItems([...items, { ...filaVacia }]);
  }

  function quitarFila(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function aplicarUbicacionATodos() {
    setItems(
      items.map((it) => ({
        ...it,
        sede: form.sede,
        area: form.area,
        detalle: form.detalle,
      }))
    );
  }

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
    setError(null);

    // Filas completamente vacías (nunca tocadas) se ignoran en silencio --
    // el resto tiene que estar completo (código + tipo de producto + sede/
    // área, lo mismo que exige el backend -- detalle es opcional) o se
    // rechaza el envío entero antes de pegarle a la API, para no mezclar
    // filas completas con filas a medio llenar.
    const filasConDatos = items.filter(
      (it) =>
        it.codigoInterno.trim() !== "" ||
        it.descripcion.trim() !== "" ||
        it.tipoProductoId !== "" ||
        it.costo.trim() !== "" ||
        it.sede.trim() !== "" ||
        it.area.trim() !== "" ||
        it.detalle.trim() !== ""
    );

    if (filasConDatos.length === 0) {
      setError("Agregá al menos un activo al lote.");
      return;
    }

    const filaIncompletaIdx = filasConDatos.findIndex(
      (it) =>
        it.codigoInterno.trim() === "" ||
        it.tipoProductoId === "" ||
        it.sede.trim() === "" ||
        it.area.trim() === ""
    );
    if (filaIncompletaIdx !== -1) {
      setError(
        `La fila ${filaIncompletaIdx + 1} está incompleta: código interno, tipo de producto y sede/área son obligatorios.`
      );
      return;
    }

    setCreating(true);
    try {
      await registrarIngresoConActivoNuevo({
        tipoIngreso: form.tipoIngreso || undefined,
        ordenCompra: form.ordenCompra || undefined,
        numeroDocumento: form.numeroDocumento || undefined,
        proveedor: form.proveedor || undefined,
        items: filasConDatos.map((it) => ({
          codigoInterno: it.codigoInterno,
          descripcion: it.descripcion || undefined,
          tipoProductoId: Number(it.tipoProductoId),
          estadoOperativo: "disponible",
          costo: it.costo ? Number(it.costo) : undefined,
          moneda: it.costo ? it.moneda : undefined,
          sede: it.sede,
          area: it.area,
          detalle: it.detalle || undefined,
        })),
      });
      setForm({
        tipoIngreso: "compra",
        ordenCompra: "",
        numeroDocumento: "",
        proveedor: "",
        sede: "",
        area: "",
        detalle: "",
      });
      setItems([{ ...filaVacia }]);
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
        description='Esto es "desde que llega el activo": crea el/los activo(s) y los registra en un solo documento de ingreso. Podés cargar un solo activo o un lote de varios de una sola vez.'
      >
        <form onSubmit={handleRegistrarIngreso} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Datos del ingreso (aplican a todo el lote)</p>
            <TipoIngresoField
              value={form.tipoIngreso}
              onChange={(v) => setForm({ ...form, tipoIngreso: v })}
            />
            <Field label="Orden de compra (opcional)">
              <input
                className={inputClass}
                value={form.ordenCompra}
                onChange={(e) => setForm({ ...form, ordenCompra: e.target.value })}
              />
            </Field>
            <Field label="N° de documento (opcional)">
              <input
                className={inputClass}
                value={form.numeroDocumento}
                onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
              />
            </Field>
            <Field label="Proveedor (opcional)">
              <input
                className={inputClass}
                value={form.proveedor}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              />
            </Field>
            <p className="text-xs text-neutral-500">
              Ubicación por defecto (se puede ajustar por activo abajo):
            </p>
            <Field label="Sede">
              <input
                className={inputClass}
                value={form.sede}
                onChange={(e) => setForm({ ...form, sede: e.target.value })}
              />
            </Field>
            <Field label="Área">
              <input
                className={inputClass}
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </Field>
            <Field label="Detalle (opcional)">
              <input
                className={inputClass}
                value={form.detalle}
                onChange={(e) => setForm({ ...form, detalle: e.target.value })}
              />
            </Field>
            <Button type="button" variant="secondary" onClick={aplicarUbicacionATodos}>
              Aplicar a todos los activos
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="text-sm font-medium">Activos a registrar en este ingreso</p>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 rounded border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-500">Activo {idx + 1}</p>
                  {items.length > 1 && (
                    <Button variant="ghost" onClick={() => quitarFila(idx)}>
                      Quitar
                    </Button>
                  )}
                </div>
                <Field label="Código interno">
                  <input
                    className={inputClass}
                    value={item.codigoInterno}
                    onChange={(e) => actualizarFila(idx, { codigoInterno: e.target.value })}
                  />
                </Field>
                <Field label="Descripción">
                  <input
                    className={inputClass}
                    value={item.descripcion}
                    onChange={(e) => actualizarFila(idx, { descripcion: e.target.value })}
                  />
                </Field>
                <Field label="Tipo de producto">
                  <select
                    className={inputClass}
                    value={item.tipoProductoId}
                    onChange={(e) => actualizarFila(idx, { tipoProductoId: e.target.value })}
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
                <Field label="Costo (opcional)">
                  <input
                    type="number"
                    className={inputClass}
                    value={item.costo}
                    onChange={(e) => actualizarFila(idx, { costo: e.target.value })}
                  />
                </Field>
                {item.costo && (
                  <Field label="Moneda">
                    <select
                      className={inputClass}
                      value={item.moneda}
                      onChange={(e) => actualizarFila(idx, { moneda: e.target.value })}
                    >
                      <option value="USD">USD</option>
                      <option value="PEN">PEN</option>
                    </select>
                  </Field>
                )}
                <Field label="Sede">
                  <input
                    className={inputClass}
                    value={item.sede}
                    onChange={(e) => actualizarFila(idx, { sede: e.target.value })}
                  />
                </Field>
                <Field label="Área">
                  <input
                    className={inputClass}
                    value={item.area}
                    onChange={(e) => actualizarFila(idx, { area: e.target.value })}
                  />
                </Field>
                <Field label="Detalle (opcional)">
                  <input
                    className={inputClass}
                    value={item.detalle}
                    onChange={(e) => actualizarFila(idx, { detalle: e.target.value })}
                  />
                </Field>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={agregarFila}>
              + Agregar otro activo a este ingreso
            </Button>
          </div>

          <Button type="submit" loading={creating} disabled={tipos.length === 0}>
            Registrar ingreso
          </Button>
        </form>
      </Card>
    </div>
  );
}

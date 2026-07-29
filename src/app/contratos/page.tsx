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
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFinPrevista: "",
  });

  const filaVacia = {
    idActivo: "",
    idResponsable: "",
    tipoTarifa: "MENSUAL" as
      | "DIARIO"
      | "SEMANAL"
      | "MENSUAL"
      | "TRIMESTRAL"
      | "SEMESTRAL"
      | "ANUAL",
    precioBase: "",
    moneda: "USD" as "PEN" | "USD",
  };
  const [items, setItems] = useState([{ ...filaVacia }]);

  function actualizarFila(idx: number, cambios: Partial<typeof filaVacia>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));
  }

  function agregarFila() {
    setItems([...items, { ...filaVacia }]);
  }

  function quitarFila(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

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
    setError(null);

    // Filas completamente vacías (nunca tocadas) se ignoran en silencio --
    // el resto tiene que tener activo y precio base (lo mismo que ya exigía
    // el formulario de un solo activo) o se rechaza el envío entero antes
    // de pegarle a la API.
    const filasConDatos = items.filter(
      (it) => it.idActivo.trim() !== "" || it.precioBase.trim() !== ""
    );

    if (filasConDatos.length === 0) {
      setError("Agregá al menos un activo al contrato.");
      return;
    }

    const filaIncompletaIdx = filasConDatos.findIndex(
      (it) => it.idActivo.trim() === "" || it.precioBase.trim() === ""
    );
    if (filaIncompletaIdx !== -1) {
      setError(
        `La fila ${filaIncompletaIdx + 1} está incompleta: activo y precio base son obligatorios.`
      );
      return;
    }

    setCreating(true);
    try {
      await createContrato({
        contratoCodigo: form.contratoCodigo,
        idCliente: Number(form.idCliente),
        fechaInicio: form.fechaInicio,
        fechaFinPrevista: form.fechaFinPrevista || undefined,
        detalles: filasConDatos.map((it) => ({
          idActivo: Number(it.idActivo),
          idResponsable: it.idResponsable ? Number(it.idResponsable) : undefined,
          tipoTarifa: it.tipoTarifa,
          precioBase: Number(it.precioBase),
          moneda: it.moneda,
          diaFacturacion: 5,
          fechaInicioAlquiler: form.fechaInicio,
        })),
      });
      setForm({ ...form, contratoCodigo: "" });
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
              onChange={(e) => {
                setForm({ ...form, idCliente: e.target.value });
                setItems(items.map((it) => ({ ...it, idResponsable: "" })));
              }}
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
          <Field label="Fecha de inicio">
            <input
              type="date"
              className={inputClass}
              value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              required
            />
          </Field>

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="text-sm font-medium">Activos a incluir en este contrato</p>
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
                <Field label="Activo">
                  <select
                    className={inputClass}
                    value={item.idActivo}
                    onChange={(e) => actualizarFila(idx, { idActivo: e.target.value })}
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
                <Field label="Responsable (opcional)">
                  <select
                    className={inputClass}
                    value={item.idResponsable}
                    onChange={(e) => actualizarFila(idx, { idResponsable: e.target.value })}
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
                <Field label="Tipo de tarifa">
                  <select
                    className={inputClass}
                    value={item.tipoTarifa}
                    onChange={(e) =>
                      actualizarFila(idx, {
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
                    value={item.precioBase}
                    onChange={(e) => actualizarFila(idx, { precioBase: e.target.value })}
                  />
                </Field>
                <Field label="Moneda">
                  <select
                    className={inputClass}
                    value={item.moneda}
                    onChange={(e) =>
                      actualizarFila(idx, { moneda: e.target.value as "PEN" | "USD" })
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="PEN">PEN</option>
                  </select>
                </Field>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={agregarFila}>
              + Agregar otro activo a este contrato
            </Button>
          </div>

          <Button type="submit" loading={creating}>
            Crear contrato
          </Button>
        </form>
      </Card>
    </div>
  );
}

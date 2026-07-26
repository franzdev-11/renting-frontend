"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  agregarContactoCobranza,
  cambiarEstadoCobranza,
  desactivarContactoCobranza,
  emitirCobranza,
  generarCobranza,
  getCobranzaVigente,
  getHistorialEstadosCobranza,
  listCobranzasByContrato,
  listContactosCobranza,
  registrarPagoCobranza,
} from "@/lib/endpoints";
import type {
  CobranzaContactoResponse,
  CobranzaDetalleResponse,
  CobranzaResponse,
  HistorialEstadoCobranzaResponse,
} from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

const ESTADOS = ["PENDIENTE", "FACTURADO", "ENVIADO", "PAGADO", "VENCIDO", "ANULADO"];

export default function CobranzaSection({ idContrato }: { idContrato: number }) {
  const [cobranzas, setCobranzas] = useState<CobranzaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const [seleccionada, setSeleccionada] = useState<CobranzaResponse | null>(null);
  const [historial, setHistorial] = useState<HistorialEstadoCobranzaResponse[]>([]);
  const [contactos, setContactos] = useState<CobranzaContactoResponse[]>([]);

  const [factura, setFactura] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [medioPago, setMedioPago] = useState("");
  const [contactoForm, setContactoForm] = useState({ nombre: "", email: "", rol: "TO" });

  const [consultaPeriodo, setConsultaPeriodo] = useState(
    new Date().toISOString().slice(0, 7) + "-01"
  );
  const [consultaResultado, setConsultaResultado] = useState<CobranzaResponse | null>(null);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      setCobranzas(await listCobranzasByContrato(idContrato));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idContrato]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await cargar();
      if (seleccionada) await verDetalle(seleccionada);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verDetalle(c: CobranzaResponse) {
    setError(null);
    try {
      const [h, ct] = await Promise.all([
        getHistorialEstadosCobranza(c.idCobranza),
        listContactosCobranza(c.idCobranza),
      ]);
      setSeleccionada(c);
      setHistorial(h);
      setContactos(ct);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  return (
    <Card title="Cobranzas">
      <Table
        columns={[
          { header: "Período", render: (c: CobranzaResponse) => c.periodo },
          { header: "Estado", render: (c: CobranzaResponse) => <Badge value={c.estado} /> },
          { header: "Total", render: (c: CobranzaResponse) => `${c.total} ${c.moneda ?? ""}` },
          { header: "Factura", render: (c: CobranzaResponse) => c.factura ?? "—" },
          {
            header: "",
            render: (c: CobranzaResponse) => (
              <Button variant="ghost" onClick={() => verDetalle(c)}>
                Gestionar
              </Button>
            ),
          },
        ]}
        rows={cobranzas}
        keyFn={(c) => c.idCobranza}
        emptyLabel={loading ? "Cargando..." : "Este contrato todavía no tiene cobranzas"}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => generarCobranza({ idContrato, periodo }));
        }}
        className="flex items-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
      >
        <Field label="Generar cobranza del período">
          <input
            type="date"
            className={inputClass}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={busy}>
          Generar
        </Button>
      </form>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <p className="text-sm font-medium">
          Consultar cobranza vigente de un período (ignora anuladas)
        </p>
        <div className="flex items-end gap-3">
          <Field label="Período">
            <input
              type="date"
              className={inputClass}
              value={consultaPeriodo}
              onChange={(e) => setConsultaPeriodo(e.target.value)}
            />
          </Field>
          <Button
            variant="secondary"
            loading={consultando}
            onClick={async () => {
              setConsultando(true);
              setConsultaError(null);
              setConsultaResultado(null);
              try {
                setConsultaResultado(await getCobranzaVigente(idContrato, consultaPeriodo));
              } catch (e) {
                setConsultaError(e instanceof ApiError ? e.message : String(e));
              } finally {
                setConsultando(false);
              }
            }}
          >
            Consultar
          </Button>
        </div>
        <ErrorBanner message={consultaError} />
        {consultaResultado && (
          <div className="rounded border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            Cobranza vigente #{consultaResultado.idCobranza} —{" "}
            <Badge value={consultaResultado.estado} /> — total {consultaResultado.total}{" "}
            {consultaResultado.moneda}
            <Button variant="ghost" onClick={() => verDetalle(consultaResultado)}>
              Ver detalle
            </Button>
          </div>
        )}
      </div>

      {seleccionada && (
        <div className="flex flex-col gap-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Cobranza {seleccionada.periodo} — <Badge value={seleccionada.estado} />
            </p>
            <Button variant="ghost" onClick={() => setSeleccionada(null)}>
              Cerrar
            </Button>
          </div>
          <ErrorBanner message={error} />

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-neutral-500">Subtotal</p>
              <p>{seleccionada.subtotal}</p>
            </div>
            <div>
              <p className="text-neutral-500">IGV</p>
              <p>{seleccionada.igv}</p>
            </div>
            <div>
              <p className="text-neutral-500">Total</p>
              <p>{seleccionada.total}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">
              Detalle (por activo, el desglose que arma el prorrateo)
            </p>
            <Table
              columns={[
                {
                  header: "Activo",
                  render: (d: CobranzaDetalleResponse) => d.codigoInternoActivo,
                },
                {
                  header: "Descripción",
                  render: (d: CobranzaDetalleResponse) => d.descripcion ?? "—",
                },
                {
                  header: "Días facturados",
                  render: (d: CobranzaDetalleResponse) => d.diasFacturados,
                },
                {
                  header: "Precio base",
                  render: (d: CobranzaDetalleResponse) => d.precioBase,
                },
                {
                  header: "Descuento",
                  render: (d: CobranzaDetalleResponse) => d.descuento ?? 0,
                },
                {
                  header: "Precio final",
                  render: (d: CobranzaDetalleResponse) => d.precioFinal,
                },
                {
                  header: "Subtotal línea",
                  render: (d: CobranzaDetalleResponse) => d.subtotal,
                },
              ]}
              rows={seleccionada.detalles}
              keyFn={(d) => d.idCobranzasDetalle}
              emptyLabel="Esta cobranza no tiene líneas de detalle"
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => emitirCobranza(seleccionada.idCobranza, { factura }));
            }}
            className="flex items-end gap-3"
          >
            <Field label="Emitir con número de factura">
              <input
                className={inputClass}
                value={factura}
                onChange={(e) => setFactura(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="secondary" loading={busy}>
              Emitir
            </Button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => registrarPagoCobranza(seleccionada.idCobranza, { medioPago }));
            }}
            className="flex items-end gap-3"
          >
            <Field label="Registrar pago (medio de pago)">
              <input
                className={inputClass}
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value)}
                placeholder="Transferencia, tarjeta, etc."
              />
            </Field>
            <Button type="submit" variant="secondary" loading={busy}>
              Registrar pago
            </Button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                cambiarEstadoCobranza(seleccionada.idCobranza, { nuevoEstado })
              );
            }}
            className="flex items-end gap-3"
          >
            <Field label="Cambiar estado manualmente">
              <select
                className={inputClass}
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona un estado
                </option>
                {ESTADOS.filter((e) => e !== seleccionada.estado).map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" variant="danger" loading={busy}>
              Cambiar estado
            </Button>
          </form>
          <p className="text-xs text-neutral-500">
            No todas las transiciones están permitidas (ej: no se puede anular algo
            ya PAGADO) — el backend valida y te avisa si el cambio no es válido.
          </p>

          <div>
            <p className="mb-2 text-sm font-medium">Historial de estados</p>
            <Table
              columns={[
                {
                  header: "Cambio",
                  render: (h: HistorialEstadoCobranzaResponse) =>
                    `${h.estadoAnterior ?? "—"} → ${h.estadoNuevo}`,
                },
                {
                  header: "Fecha",
                  render: (h: HistorialEstadoCobranzaResponse) =>
                    new Date(h.fechaCambio).toLocaleString(),
                },
                {
                  header: "Observación",
                  render: (h: HistorialEstadoCobranzaResponse) => h.observacion ?? "—",
                },
              ]}
              rows={historial}
              keyFn={(h) => h.idHistorial}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Contactos</p>
            <Table
              columns={[
                { header: "Nombre", render: (c: CobranzaContactoResponse) => c.nombre ?? "—" },
                { header: "Email", render: (c: CobranzaContactoResponse) => c.email },
                { header: "Rol", render: (c: CobranzaContactoResponse) => c.rol ?? "—" },
                {
                  header: "",
                  render: (c: CobranzaContactoResponse) =>
                    c.activo ? (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          run(async () => {
                            await desactivarContactoCobranza(c.idContacto);
                            setContactos(await listContactosCobranza(seleccionada.idCobranza));
                          })
                        }
                      >
                        Desactivar
                      </Button>
                    ) : (
                      "inactivo"
                    ),
                },
              ]}
              rows={contactos}
              keyFn={(c) => c.idContacto}
              emptyLabel="Sin contactos"
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await agregarContactoCobranza(seleccionada.idCobranza, contactoForm);
                  setContactoForm({ nombre: "", email: "", rol: "TO" });
                  setContactos(await listContactosCobranza(seleccionada.idCobranza));
                });
              }}
              className="mt-3 flex items-end gap-3"
            >
              <Field label="Email del contacto">
                <input
                  type="email"
                  className={inputClass}
                  value={contactoForm.email}
                  onChange={(e) =>
                    setContactoForm({ ...contactoForm, email: e.target.value })
                  }
                  required
                />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>
                Agregar
              </Button>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

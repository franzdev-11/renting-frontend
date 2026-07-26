"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  agregarDetalleContrato,
  cambiarResponsable,
  confirmarEntregaContrato,
  confirmarRecojoActivo,
  devolverActivo,
  enviarAMantenimiento,
  extenderContrato,
  finalizarContrato,
  getContrato,
  listActivos,
  listMovimientosByContrato,
  listResponsablesByCliente,
  reemplazarActivo,
  repotenciarSwap,
  updateContrato,
} from "@/lib/endpoints";
import CobranzaSection from "@/components/CobranzaSection";
import type {
  ActivoResponse,
  ContratoDetalleResponse,
  ContratoResponse,
  MovimientoResponse,
  ResponsableResponse,
} from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

export default function ContratoDetallePage() {
  const params = useParams<{ id: string }>();
  const idContrato = Number(params.id);

  const [contrato, setContrato] = useState<ContratoResponse | null>(null);
  const [activos, setActivos] = useState<ActivoResponse[]>([]);
  const [responsables, setResponsables] = useState<ResponsableResponse[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [detalleSeleccionado, setDetalleSeleccionado] =
    useState<ContratoDetalleResponse | null>(null);

  const [reemplazoIdActivo, setReemplazoIdActivo] = useState("");
  const [reemplazoEstadoAnterior, setReemplazoEstadoAnterior] = useState<
    "mantenimiento" | "disponible"
  >("mantenimiento");
  const [nuevoResponsableId, setNuevoResponsableId] = useState("");
  const [extenderFecha, setExtenderFecha] = useState("");
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false);
  const [codigoConfirmacion, setCodigoConfirmacion] = useState("");
  const [editandoContrato, setEditandoContrato] = useState(false);
  const [contratoEditForm, setContratoEditForm] = useState({
    entidad: "",
    tipoGrupo: "",
    nombreGrupo: "",
    ubicacion: "",
    concepto: "",
    estadoLegal: "",
    legalContrato: "",
    contactoCobranza: "",
    logistica: "",
  });
  const [repotenciacion, setRepotenciacion] = useState({
    idActivoNuevo: "",
    nuevoPrecioBase: "",
  });

  const [nuevoDetalle, setNuevoDetalle] = useState({
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
    diaFacturacion: "5",
    fechaInicioAlquiler: new Date().toISOString().slice(0, 10),
  });

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const c = await getContrato(idContrato);
      setContrato(c);
      const [a, r, m] = await Promise.all([
        listActivos(),
        listResponsablesByCliente(c.idCliente),
        listMovimientosByContrato(idContrato).catch(() => []),
      ]);
      setActivos(a);
      setResponsables(r);
      setMovimientos(m);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(idContrato)) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idContrato]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setDetalleSeleccionado(null);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-neutral-500">Cargando...</p>;
  if (!contrato) return <ErrorBanner message={error ?? "Contrato no encontrado"} />;

  const activosDisponiblesParaAgregar = activos.filter(
    (a) => !contrato.detalles.some((d) => d.activo && d.idActivo === a.idActivo)
  );

  function estadoOperativoDe(idActivo: number) {
    return activos.find((a) => a.idActivo === idActivo)?.estadoOperativo;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{contrato.contratoCodigo}</h1>
        <p className="text-sm text-neutral-500">{contrato.clienteRazonSocial}</p>
      </div>
      <ErrorBanner message={error} />

      <Card
        title="Datos generales"
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setContratoEditForm({
                  entidad: contrato.entidad ?? "",
                  tipoGrupo: contrato.tipoGrupo ?? "",
                  nombreGrupo: contrato.nombreGrupo ?? "",
                  ubicacion: contrato.ubicacion ?? "",
                  concepto: contrato.concepto ?? "",
                  estadoLegal: contrato.estadoLegal ?? "",
                  legalContrato: contrato.legalContrato ?? "",
                  contactoCobranza: contrato.contactoCobranza ?? "",
                  logistica: contrato.logistica ?? "",
                });
                setEditandoContrato(true);
              }}
            >
              Editar
            </Button>
            {contrato.vigente && (
              <Button
                variant="secondary"
                onClick={() => {
                  setCodigoConfirmacion("");
                  setConfirmandoFinalizar(true);
                }}
                loading={busy}
              >
                Finalizar contrato
              </Button>
            )}
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-neutral-500">Vigente</dt>
            <dd>
              <Badge value={contrato.vigente} />
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Fecha inicio</dt>
            <dd>{contrato.fechaInicio}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Fecha fin prevista</dt>
            <dd>{contrato.fechaFinPrevista ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Fecha fin real</dt>
            <dd>{contrato.fechaFinReal ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Entidad</dt>
            <dd>{contrato.entidad ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Ubicación</dt>
            <dd>{contrato.ubicacion ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Concepto</dt>
            <dd>{contrato.concepto ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Contacto de cobranza</dt>
            <dd>{contrato.contactoCobranza ?? "—"}</dd>
          </div>
        </dl>

        {editandoContrato && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                updateContrato(idContrato, contratoEditForm).then(() =>
                  setEditandoContrato(false)
                )
              );
            }}
            className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          >
            <p className="text-sm font-medium">Editar datos generales del contrato</p>
            <Field label="Entidad">
              <input
                className={inputClass}
                value={contratoEditForm.entidad}
                onChange={(e) =>
                  setContratoEditForm({ ...contratoEditForm, entidad: e.target.value })
                }
              />
            </Field>
            <Field label="Grupo / tipo de grupo">
              <div className="flex gap-3">
                <input
                  className={inputClass}
                  placeholder="Tipo de grupo"
                  value={contratoEditForm.tipoGrupo}
                  onChange={(e) =>
                    setContratoEditForm({ ...contratoEditForm, tipoGrupo: e.target.value })
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Nombre de grupo"
                  value={contratoEditForm.nombreGrupo}
                  onChange={(e) =>
                    setContratoEditForm({ ...contratoEditForm, nombreGrupo: e.target.value })
                  }
                />
              </div>
            </Field>
            <Field label="Ubicación">
              <input
                className={inputClass}
                value={contratoEditForm.ubicacion}
                onChange={(e) =>
                  setContratoEditForm({ ...contratoEditForm, ubicacion: e.target.value })
                }
              />
            </Field>
            <Field label="Concepto">
              <input
                className={inputClass}
                value={contratoEditForm.concepto}
                onChange={(e) =>
                  setContratoEditForm({ ...contratoEditForm, concepto: e.target.value })
                }
              />
            </Field>
            <Field label="Estado legal">
              <input
                className={inputClass}
                value={contratoEditForm.estadoLegal}
                onChange={(e) =>
                  setContratoEditForm({ ...contratoEditForm, estadoLegal: e.target.value })
                }
              />
            </Field>
            <Field label="Contrato legal (referencia)">
              <input
                className={inputClass}
                value={contratoEditForm.legalContrato}
                onChange={(e) =>
                  setContratoEditForm({ ...contratoEditForm, legalContrato: e.target.value })
                }
              />
            </Field>
            <Field label="Contacto de cobranza">
              <input
                className={inputClass}
                value={contratoEditForm.contactoCobranza}
                onChange={(e) =>
                  setContratoEditForm({
                    ...contratoEditForm,
                    contactoCobranza: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Logística">
              <input
                className={inputClass}
                value={contratoEditForm.logistica}
                onChange={(e) =>
                  setContratoEditForm({ ...contratoEditForm, logistica: e.target.value })
                }
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>
                Guardar cambios
              </Button>
              <Button variant="ghost" onClick={() => setEditandoContrato(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {contrato.vigente && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => extenderContrato(idContrato, { nuevaFechaFinPrevista: extenderFecha }));
            }}
            className="flex items-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          >
            <Field label="Extender fecha fin prevista">
              <input
                type="date"
                className={inputClass}
                value={extenderFecha}
                onChange={(e) => setExtenderFecha(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="secondary" loading={busy}>
              Extender
            </Button>
          </form>
        )}
      </Card>

      <Card title="Activos del contrato">
        <Table
          columns={[
            {
              header: "Activo",
              render: (d: ContratoDetalleResponse) => d.codigoInternoActivo,
            },
            {
              header: "Responsable",
              render: (d: ContratoDetalleResponse) => d.nombreResponsable ?? "—",
            },
            {
              header: "Tarifa",
              render: (d: ContratoDetalleResponse) =>
                `${d.tipoTarifa} · ${d.precioFinal} ${d.moneda}`,
            },
            {
              header: "Fecha fin prevista",
              render: (d: ContratoDetalleResponse) => d.fechaFinPrevista ?? "—",
            },
            {
              header: "Vigente",
              render: (d: ContratoDetalleResponse) => <Badge value={d.activo} />,
            },
            {
              header: "Estado del activo",
              render: (d: ContratoDetalleResponse) => (
                <Badge value={estadoOperativoDe(d.idActivo)} />
              ),
            },
            {
              header: "Acciones",
              render: (d: ContratoDetalleResponse) => {
                const estado = estadoOperativoDe(d.idActivo);
                if (d.activo && estado === "pendiente_entrega") {
                  return (
                    <Button
                      variant="secondary"
                      loading={busy}
                      onClick={() => run(() => confirmarEntregaContrato(d.idDetalle))}
                    >
                      Confirmar entrega
                    </Button>
                  );
                }
                if (!d.activo && estado === "pendiente_recojo") {
                  return (
                    <Button
                      variant="secondary"
                      loading={busy}
                      onClick={() => run(() => confirmarRecojoActivo(d.idActivo))}
                    >
                      Confirmar recojo
                    </Button>
                  );
                }
                if (d.activo) {
                  return (
                    <Button variant="ghost" onClick={() => setDetalleSeleccionado(d)}>
                      Gestionar
                    </Button>
                  );
                }
                return "—";
              },
            },
          ]}
          rows={contrato.detalles}
          keyFn={(d) => d.idDetalle}
        />
      </Card>

      {detalleSeleccionado && (
        <Card
          title={`Gestionar: ${detalleSeleccionado.codigoInternoActivo}`}
          action={
            <Button variant="ghost" onClick={() => setDetalleSeleccionado(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-sm font-medium">Devolver activo</p>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() =>
                  run(() => devolverActivo(detalleSeleccionado.idDetalle, {}))
                }
              >
                Devolver
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Enviar a mantenimiento</p>
              <Button
                variant="secondary"
                loading={busy}
                onClick={() =>
                  run(() => enviarAMantenimiento(detalleSeleccionado.idDetalle))
                }
              >
                Enviar a mantenimiento
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Reemplazar por otro activo</p>
              <Field label="Activo de reemplazo">
                <select
                  className={inputClass}
                  value={reemplazoIdActivo}
                  onChange={(e) => setReemplazoIdActivo(e.target.value)}
                >
                  <option value="" disabled>
                    Selecciona un activo
                  </option>
                  {activos
                    .filter((a) => a.idActivo !== detalleSeleccionado.idActivo)
                    .map((a) => (
                      <option key={a.idActivo} value={a.idActivo}>
                        {a.codigoInterno} ({a.estadoOperativo ?? "sin estado"})
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="¿Cómo queda el activo que se devuelve?">
                <select
                  className={inputClass}
                  value={reemplazoEstadoAnterior}
                  onChange={(e) =>
                    setReemplazoEstadoAnterior(
                      e.target.value as "mantenimiento" | "disponible"
                    )
                  }
                >
                  <option value="mantenimiento">
                    A mantenimiento (reemplazo por falla — lo más común)
                  </option>
                  <option value="disponible">
                    Disponible (el activo devuelto está bien, reemplazo definitivo)
                  </option>
                </select>
              </Field>
              <Button
                variant="secondary"
                loading={busy}
                disabled={!reemplazoIdActivo}
                onClick={() =>
                  run(() =>
                    reemplazarActivo(detalleSeleccionado.idDetalle, {
                      idActivoReemplazo: Number(reemplazoIdActivo),
                      estadoActivoAnterior: reemplazoEstadoAnterior,
                    })
                  )
                }
              >
                Reemplazar
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">
                Repotenciar (swap contra otro activo ya repotenciado)
              </p>
              <Field label="Activo nuevo (ya repotenciado y disponible)">
                <select
                  className={inputClass}
                  value={repotenciacion.idActivoNuevo}
                  onChange={(e) =>
                    setRepotenciacion({ ...repotenciacion, idActivoNuevo: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Selecciona un activo
                  </option>
                  {activos
                    .filter((a) => a.idActivo !== detalleSeleccionado.idActivo)
                    .map((a) => (
                      <option key={a.idActivo} value={a.idActivo}>
                        {a.codigoInterno} ({a.estadoOperativo ?? "sin estado"})
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Nuevo precio base">
                <input
                  type="number"
                  className={inputClass}
                  value={repotenciacion.nuevoPrecioBase}
                  onChange={(e) =>
                    setRepotenciacion({
                      ...repotenciacion,
                      nuevoPrecioBase: e.target.value,
                    })
                  }
                />
              </Field>
              <Button
                variant="secondary"
                loading={busy}
                disabled={!repotenciacion.idActivoNuevo || !repotenciacion.nuevoPrecioBase}
                onClick={() =>
                  run(() =>
                    repotenciarSwap(detalleSeleccionado.idDetalle, {
                      idActivoNuevo: Number(repotenciacion.idActivoNuevo),
                      nuevoPrecioBase: Number(repotenciacion.nuevoPrecioBase),
                      tipoTarifa: detalleSeleccionado.tipoTarifa,
                      moneda: detalleSeleccionado.moneda,
                      fechaInicioAlquiler: new Date().toISOString().slice(0, 10),
                    })
                  )
                }
              >
                Repotenciar
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Cambiar responsable</p>
              <Field label="Nuevo responsable">
                <select
                  className={inputClass}
                  value={nuevoResponsableId}
                  onChange={(e) => setNuevoResponsableId(e.target.value)}
                >
                  <option value="" disabled>
                    Selecciona un responsable
                  </option>
                  {responsables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombreCompleto}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                variant="secondary"
                loading={busy}
                disabled={!nuevoResponsableId}
                onClick={() =>
                  run(() =>
                    cambiarResponsable(detalleSeleccionado.idDetalle, {
                      idResponsable: Number(nuevoResponsableId),
                    })
                  )
                }
              >
                Cambiar responsable
              </Button>
            </div>
          </div>
        </Card>
      )}

      {contrato.vigente && (
        <Card title="Agregar otro activo al contrato">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                agregarDetalleContrato(idContrato, {
                  idActivo: Number(nuevoDetalle.idActivo),
                  idResponsable: nuevoDetalle.idResponsable
                    ? Number(nuevoDetalle.idResponsable)
                    : undefined,
                  tipoTarifa: nuevoDetalle.tipoTarifa,
                  precioBase: Number(nuevoDetalle.precioBase),
                  moneda: nuevoDetalle.moneda,
                  diaFacturacion: Number(nuevoDetalle.diaFacturacion),
                  fechaInicioAlquiler: nuevoDetalle.fechaInicioAlquiler,
                })
              );
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Activo">
              <select
                className={inputClass}
                value={nuevoDetalle.idActivo}
                onChange={(e) =>
                  setNuevoDetalle({ ...nuevoDetalle, idActivo: e.target.value })
                }
                required
              >
                <option value="" disabled>
                  Selecciona un activo
                </option>
                {activosDisponiblesParaAgregar.map((a) => (
                  <option key={a.idActivo} value={a.idActivo}>
                    {a.codigoInterno} ({a.estadoOperativo ?? "sin estado"})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsable (opcional)">
              <select
                className={inputClass}
                value={nuevoDetalle.idResponsable}
                onChange={(e) =>
                  setNuevoDetalle({ ...nuevoDetalle, idResponsable: e.target.value })
                }
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
                value={nuevoDetalle.tipoTarifa}
                onChange={(e) =>
                  setNuevoDetalle({
                    ...nuevoDetalle,
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
                value={nuevoDetalle.precioBase}
                onChange={(e) =>
                  setNuevoDetalle({ ...nuevoDetalle, precioBase: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Fecha de inicio de alquiler">
              <input
                type="date"
                className={inputClass}
                value={nuevoDetalle.fechaInicioAlquiler}
                onChange={(e) =>
                  setNuevoDetalle({
                    ...nuevoDetalle,
                    fechaInicioAlquiler: e.target.value,
                  })
                }
                required
              />
            </Field>
            <p className="text-xs text-neutral-500">
              Si no indicás fecha fin, se calcula sola según la fecha de inicio y el tipo de
              tarifa elegido.
            </p>
            <Button type="submit" loading={busy}>
              Agregar activo al contrato
            </Button>
          </form>
        </Card>
      )}

      <Card title="Historial de movimientos del contrato">
        <Table
          columns={[
            {
              header: "Activo",
              render: (m: MovimientoResponse) => m.codigoInternoActivo ?? `#${m.idActivo}`,
            },
            { header: "Tipo", render: (m: MovimientoResponse) => <Badge value={m.tipoMov} /> },
            {
              header: "Estado",
              render: (m: MovimientoResponse) => <Badge value={m.estadoActual} />,
            },
            { header: "Motivo", render: (m: MovimientoResponse) => m.motivo ?? "—" },
            {
              header: "Fecha",
              render: (m: MovimientoResponse) => new Date(m.fechaMovimiento).toLocaleString(),
            },
          ]}
          rows={movimientos}
          keyFn={(m) => m.idMovimiento}
          emptyLabel="Este contrato todavía no tiene movimientos"
        />
      </Card>

      <CobranzaSection idContrato={idContrato} />

      {confirmandoFinalizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded border border-neutral-800 bg-neutral-950 p-6">
            <h2 className="text-lg font-semibold text-red-400">Finalizar contrato</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Esta acción no se puede deshacer: el contrato queda cerrado, se devuelven todos
              los activos y ya no vas a poder editar la fecha fin real. Para confirmar, escribí
              el código del contrato:{" "}
              <span className="font-mono font-semibold text-neutral-200">
                {contrato.contratoCodigo}
              </span>
            </p>
            <input
              className={`${inputClass} mt-4`}
              value={codigoConfirmacion}
              onChange={(e) => setCodigoConfirmacion(e.target.value)}
              placeholder={contrato.contratoCodigo}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmandoFinalizar(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={codigoConfirmacion !== contrato.contratoCodigo}
                loading={busy}
                onClick={() =>
                  run(() => finalizarContrato(idContrato)).then(() =>
                    setConfirmandoFinalizar(false)
                  )
                }
              >
                Finalizar contrato definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

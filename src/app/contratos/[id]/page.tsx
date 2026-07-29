"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  agregarDetallesLoteContrato,
  cambiarEstadoMovimiento,
  cambiarResponsable,
  confirmarEntregaContrato,
  confirmarEntregaLoteContrato,
  confirmarRecojoActivo,
  confirmarRecojoLoteContrato,
  devolverActivo,
  editarFechaInicioAlquiler,
  enviarAMantenimiento,
  extenderContrato,
  finalizarContrato,
  getContrato,
  getHistorialEstadosMovimiento,
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
  HistorialEstadoResponse,
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
  const [editarFechaForm, setEditarFechaForm] = useState("");
  const [mostrarSoloVigentes, setMostrarSoloVigentes] = useState(false);

  function abrirGestionar(d: ContratoDetalleResponse) {
    setDetalleSeleccionado(d);
    setEditarFechaForm(d.fechaInicioAlquiler ?? "");
  }

  const [movimientoSeleccionado, setMovimientoSeleccionado] =
    useState<MovimientoResponse | null>(null);
  const [historialMovimiento, setHistorialMovimiento] = useState<
    HistorialEstadoResponse[]
  >([]);
  const [nuevoEstadoMovimiento, setNuevoEstadoMovimiento] = useState("");
  const [observacionMovimiento, setObservacionMovimiento] = useState("");

  async function verHistorialMovimiento(m: MovimientoResponse) {
    setError(null);
    try {
      setHistorialMovimiento(await getHistorialEstadosMovimiento(m.idMovimiento));
      setMovimientoSeleccionado(m);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  type ConfirmacionPendiente =
    | { tipo: "entrega-individual"; idDetalle: number; label: string }
    | { tipo: "entrega-lote"; label: string }
    | { tipo: "recojo-individual"; idActivo: number; label: string }
    | { tipo: "recojo-lote"; label: string };

  const [confirmacionPendiente, setConfirmacionPendiente] =
    useState<ConfirmacionPendiente | null>(null);
  const [ubicacionForm, setUbicacionForm] = useState({
    sede: "",
    area: "",
    detalle: "",
  });

  function abrirConfirmacion(c: ConfirmacionPendiente) {
    setUbicacionForm({ sede: "", area: "", detalle: "" });
    setConfirmacionPendiente(c);
  }

  function ejecutarConfirmacion() {
    if (!confirmacionPendiente) return;
    const data = {
      sede: ubicacionForm.sede,
      area: ubicacionForm.area,
      detalle: ubicacionForm.detalle || undefined,
    };
    if (confirmacionPendiente.tipo === "entrega-individual") {
      run(() =>
        confirmarEntregaContrato(confirmacionPendiente.idDetalle, data).then(() =>
          setConfirmacionPendiente(null)
        )
      );
    } else if (confirmacionPendiente.tipo === "entrega-lote") {
      run(() =>
        confirmarEntregaLoteContrato(idContrato, data).then(() =>
          setConfirmacionPendiente(null)
        )
      );
    } else if (confirmacionPendiente.tipo === "recojo-individual") {
      run(() =>
        confirmarRecojoActivo(confirmacionPendiente.idActivo, data).then(() =>
          setConfirmacionPendiente(null)
        )
      );
    } else {
      run(() =>
        confirmarRecojoLoteContrato(idContrato, data).then(() =>
          setConfirmacionPendiente(null)
        )
      );
    }
  }

  const [reemplazoIdActivo, setReemplazoIdActivo] = useState("");
  const [reemplazoUbicacion, setReemplazoUbicacion] = useState({
    sede: "",
    area: "",
    detalle: "",
  });
  const [repotenciacionUbicacion, setRepotenciacionUbicacion] = useState({
    sede: "",
    area: "",
    detalle: "",
  });
  const [reemplazoEstadoAnterior, setReemplazoEstadoAnterior] = useState<
    "mantenimiento" | "disponible"
  >("mantenimiento");
  const [reemplazoFechaInicio, setReemplazoFechaInicio] = useState("");
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

  const filaNuevoDetalleVacia = {
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
    fechaInicioAlquiler: new Date().toISOString().slice(0, 10),
  };
  const [nuevosDetalles, setNuevosDetalles] = useState([{ ...filaNuevoDetalleVacia }]);

  function actualizarFilaNuevoDetalle(
    idx: number,
    cambios: Partial<typeof filaNuevoDetalleVacia>
  ) {
    setNuevosDetalles(
      nuevosDetalles.map((it, i) => (i === idx ? { ...it, ...cambios } : it))
    );
  }

  function agregarFilaNuevoDetalle() {
    setNuevosDetalles([...nuevosDetalles, { ...filaNuevoDetalleVacia }]);
  }

  function quitarFilaNuevoDetalle(idx: number) {
    setNuevosDetalles(nuevosDetalles.filter((_, i) => i !== idx));
  }

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
    (a) =>
      a.estadoOperativo === "disponible" &&
      !contrato.detalles.some((d) => d.activo && d.idActivo === a.idActivo)
  );

  function estadoOperativoDe(idActivo: number) {
    return activos.find((a) => a.idActivo === idActivo)?.estadoOperativo;
  }

  const estadoDetalleSeleccionado = detalleSeleccionado
    ? estadoOperativoDe(detalleSeleccionado.idActivo)
    : undefined;
  const pendienteEntregaSeleccionado = estadoDetalleSeleccionado === "pendiente_entrega";

  const hayPendientesEntrega = contrato.detalles.some(
    (d) => d.activo && estadoOperativoDe(d.idActivo) === "pendiente_entrega"
  );
  const hayPendientesRecojo = contrato.detalles.some(
    (d) => !d.activo && estadoOperativoDe(d.idActivo) === "pendiente_recojo"
  );

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

      <Card
        title="Activos del contrato"
        action={
          <Button
            variant="ghost"
            onClick={() => setMostrarSoloVigentes((v) => !v)}
          >
            {mostrarSoloVigentes ? "Ver todo el historial" : "Ver solo vigentes"}
          </Button>
        }
      >
        {(hayPendientesEntrega || hayPendientesRecojo) && (
          <div className="mb-3 flex gap-2">
            {hayPendientesEntrega && (
              <Button
                variant="secondary"
                onClick={() =>
                  abrirConfirmacion({
                    tipo: "entrega-lote",
                    label: "Confirmar entrega de todos los pendientes",
                  })
                }
              >
                Confirmar entrega de todos los pendientes
              </Button>
            )}
            {hayPendientesRecojo && (
              <Button
                variant="secondary"
                onClick={() =>
                  abrirConfirmacion({
                    tipo: "recojo-lote",
                    label: "Confirmar recojo de todos los pendientes",
                  })
                }
              >
                Confirmar recojo de todos los pendientes
              </Button>
            )}
          </div>
        )}
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
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() =>
                          abrirConfirmacion({
                            tipo: "entrega-individual",
                            idDetalle: d.idDetalle,
                            label: `Confirmar entrega: ${d.codigoInternoActivo}`,
                          })
                        }
                      >
                        Confirmar entrega
                      </Button>
                      <Button variant="ghost" onClick={() => abrirGestionar(d)}>
                        Gestionar
                      </Button>
                    </div>
                  );
                }
                if (!d.activo && estado === "pendiente_recojo") {
                  return (
                    <Button
                      variant="secondary"
                      loading={busy}
                      onClick={() =>
                        abrirConfirmacion({
                          tipo: "recojo-individual",
                          idActivo: d.idActivo,
                          label: `Confirmar recojo: ${d.codigoInternoActivo}`,
                        })
                      }
                    >
                      Confirmar recojo
                    </Button>
                  );
                }
                if (d.activo) {
                  return (
                    <Button variant="ghost" onClick={() => abrirGestionar(d)}>
                      Gestionar
                    </Button>
                  );
                }
                return "—";
              },
            },
          ]}
          rows={
            mostrarSoloVigentes
              ? contrato.detalles.filter((d) => d.activo)
              : contrato.detalles
          }
          keyFn={(d) => d.idDetalle}
          emptyLabel={
            mostrarSoloVigentes
              ? "Ningún activo vigente en este contrato ahora mismo"
              : "Este contrato todavía no tiene activos"
          }
        />
      </Card>

      {confirmacionPendiente && (
        <Card
          title={confirmacionPendiente.label}
          action={
            <Button variant="ghost" onClick={() => setConfirmacionPendiente(null)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-500">
              Si este activo ya tiene una ubicación registrada (por ejemplo, viene de un
              Reemplazar o Repotenciar), podés dejar Sede/Área vacíos.
            </p>
            <Field label="Sede">
              <input
                className={inputClass}
                value={ubicacionForm.sede}
                onChange={(e) =>
                  setUbicacionForm({ ...ubicacionForm, sede: e.target.value })
                }
              />
            </Field>
            <Field label="Área">
              <input
                className={inputClass}
                value={ubicacionForm.area}
                onChange={(e) =>
                  setUbicacionForm({ ...ubicacionForm, area: e.target.value })
                }
              />
            </Field>
            <Field label="Detalle (opcional)">
              <input
                className={inputClass}
                value={ubicacionForm.detalle}
                onChange={(e) =>
                  setUbicacionForm({ ...ubicacionForm, detalle: e.target.value })
                }
              />
            </Field>
            <Button loading={busy} onClick={ejecutarConfirmacion}>
              Confirmar
            </Button>
          </div>
        </Card>
      )}

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
              <p className="mb-2 text-sm font-medium">
                {pendienteEntregaSeleccionado
                  ? "Cancelar (todavía no se le entregó al cliente)"
                  : "Devolver activo"}
              </p>
              <Button
                variant={pendienteEntregaSeleccionado ? "danger" : "secondary"}
                loading={busy}
                onClick={() =>
                  run(() => devolverActivo(detalleSeleccionado.idDetalle, {}))
                }
              >
                {pendienteEntregaSeleccionado ? "Cancelar" : "Devolver"}
              </Button>
            </div>

            {!pendienteEntregaSeleccionado && (
              <>
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
                        .filter(
                          (a) =>
                            a.estadoOperativo === "disponible" &&
                            a.idActivo !== detalleSeleccionado.idActivo
                        )
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
                  <Field label="Fecha de inicio de alquiler (opcional, si no la ponés se usa hoy)">
                    <input
                      type="date"
                      className={inputClass}
                      value={reemplazoFechaInicio}
                      onChange={(e) => setReemplazoFechaInicio(e.target.value)}
                    />
                  </Field>
                  <Field label="Sede">
                    <input
                      className={inputClass}
                      value={reemplazoUbicacion.sede}
                      onChange={(e) =>
                        setReemplazoUbicacion({ ...reemplazoUbicacion, sede: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Área">
                    <input
                      className={inputClass}
                      value={reemplazoUbicacion.area}
                      onChange={(e) =>
                        setReemplazoUbicacion({ ...reemplazoUbicacion, area: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Detalle (opcional)">
                    <input
                      className={inputClass}
                      value={reemplazoUbicacion.detalle}
                      onChange={(e) =>
                        setReemplazoUbicacion({ ...reemplazoUbicacion, detalle: e.target.value })
                      }
                    />
                  </Field>
                  <Button
                    variant="secondary"
                    loading={busy}
                    disabled={
                      !reemplazoIdActivo ||
                      !reemplazoUbicacion.sede ||
                      !reemplazoUbicacion.area
                    }
                    onClick={() =>
                      run(() =>
                        reemplazarActivo(detalleSeleccionado.idDetalle, {
                          idActivoReemplazo: Number(reemplazoIdActivo),
                          estadoActivoAnterior: reemplazoEstadoAnterior,
                          fechaInicioAlquiler: reemplazoFechaInicio || undefined,
                          sede: reemplazoUbicacion.sede,
                          area: reemplazoUbicacion.area,
                          detalle: reemplazoUbicacion.detalle || undefined,
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
                        .filter(
                          (a) =>
                            a.estadoOperativo === "disponible" &&
                            a.idActivo !== detalleSeleccionado.idActivo
                        )
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
                  <Field label="Sede">
                    <input
                      className={inputClass}
                      value={repotenciacionUbicacion.sede}
                      onChange={(e) =>
                        setRepotenciacionUbicacion({ ...repotenciacionUbicacion, sede: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Área">
                    <input
                      className={inputClass}
                      value={repotenciacionUbicacion.area}
                      onChange={(e) =>
                        setRepotenciacionUbicacion({ ...repotenciacionUbicacion, area: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Detalle (opcional)">
                    <input
                      className={inputClass}
                      value={repotenciacionUbicacion.detalle}
                      onChange={(e) =>
                        setRepotenciacionUbicacion({ ...repotenciacionUbicacion, detalle: e.target.value })
                      }
                    />
                  </Field>
                  <Button
                    variant="secondary"
                    loading={busy}
                    disabled={
                      !repotenciacion.idActivoNuevo ||
                      !repotenciacion.nuevoPrecioBase ||
                      !repotenciacionUbicacion.sede ||
                      !repotenciacionUbicacion.area
                    }
                    onClick={() =>
                      run(() =>
                        repotenciarSwap(detalleSeleccionado.idDetalle, {
                          idActivoNuevo: Number(repotenciacion.idActivoNuevo),
                          nuevoPrecioBase: Number(repotenciacion.nuevoPrecioBase),
                          tipoTarifa: detalleSeleccionado.tipoTarifa,
                          moneda: detalleSeleccionado.moneda,
                          fechaInicioAlquiler: new Date().toISOString().slice(0, 10),
                          sede: repotenciacionUbicacion.sede,
                          area: repotenciacionUbicacion.area,
                          detalle: repotenciacionUbicacion.detalle || undefined,
                        })
                      )
                    }
                  >
                    Repotenciar
                  </Button>
                </div>
              </>
            )}

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

            <div className="flex flex-col gap-3">
              <Field label="Corregir fecha de inicio de alquiler (solo si todavía no fue facturado)">
                <input
                  type="date"
                  className={inputClass}
                  value={editarFechaForm}
                  onChange={(e) => setEditarFechaForm(e.target.value)}
                />
              </Field>
              <Button
                variant="secondary"
                loading={busy}
                disabled={!editarFechaForm}
                onClick={() =>
                  run(() =>
                    editarFechaInicioAlquiler(detalleSeleccionado.idDetalle, {
                      nuevaFechaInicioAlquiler: editarFechaForm,
                    })
                  )
                }
              >
                Guardar fecha
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
              setError(null);

              // Filas completamente vacías se ignoran en silencio -- el
              // resto tiene que tener activo y precio base, mismo criterio
              // que exigía el formulario de un solo activo.
              const filasConDatos = nuevosDetalles.filter(
                (it) => it.idActivo.trim() !== "" || it.precioBase.trim() !== ""
              );

              if (filasConDatos.length === 0) {
                setError("Agregá al menos un activo.");
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

              run(() =>
                agregarDetallesLoteContrato(idContrato, {
                  detalles: filasConDatos.map((it) => ({
                    idActivo: Number(it.idActivo),
                    idResponsable: it.idResponsable ? Number(it.idResponsable) : undefined,
                    tipoTarifa: it.tipoTarifa,
                    precioBase: Number(it.precioBase),
                    moneda: it.moneda,
                    diaFacturacion: 5,
                    fechaInicioAlquiler: it.fechaInicioAlquiler,
                  })),
                }).then(() => setNuevosDetalles([{ ...filaNuevoDetalleVacia }]))
              );
            }}
            className="flex flex-col gap-3"
          >
            {nuevosDetalles.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 rounded border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-500">Activo {idx + 1}</p>
                  {nuevosDetalles.length > 1 && (
                    <Button variant="ghost" onClick={() => quitarFilaNuevoDetalle(idx)}>
                      Quitar
                    </Button>
                  )}
                </div>
                <Field label="Activo">
                  <select
                    className={inputClass}
                    value={item.idActivo}
                    onChange={(e) =>
                      actualizarFilaNuevoDetalle(idx, { idActivo: e.target.value })
                    }
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
                    value={item.idResponsable}
                    onChange={(e) =>
                      actualizarFilaNuevoDetalle(idx, { idResponsable: e.target.value })
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
                    value={item.tipoTarifa}
                    onChange={(e) =>
                      actualizarFilaNuevoDetalle(idx, {
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
                    onChange={(e) =>
                      actualizarFilaNuevoDetalle(idx, { precioBase: e.target.value })
                    }
                  />
                </Field>
                <Field label="Fecha de inicio de alquiler">
                  <input
                    type="date"
                    className={inputClass}
                    value={item.fechaInicioAlquiler}
                    onChange={(e) =>
                      actualizarFilaNuevoDetalle(idx, {
                        fechaInicioAlquiler: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={agregarFilaNuevoDetalle}>
              + Agregar otro activo
            </Button>
            <p className="text-xs text-neutral-500">
              Si no indicás fecha fin, se calcula sola según la fecha de inicio y el tipo de
              tarifa elegido.
            </p>
            <Button type="submit" loading={busy}>
              Agregar activo(s) al contrato
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
            {
              header: "",
              render: (m: MovimientoResponse) => (
                <Button variant="ghost" onClick={() => verHistorialMovimiento(m)}>
                  Ver estados
                </Button>
              ),
            },
          ]}
          rows={movimientos}
          keyFn={(m) => m.idMovimiento}
          emptyLabel="Este contrato todavía no tiene movimientos"
        />

        {movimientoSeleccionado && (
          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Movimiento #{movimientoSeleccionado.idMovimiento} —{" "}
                <Badge value={movimientoSeleccionado.tipoMov} /> — estado actual:{" "}
                <Badge value={movimientoSeleccionado.estadoActual} />
              </p>
              <Button variant="ghost" onClick={() => setMovimientoSeleccionado(null)}>
                Cerrar
              </Button>
            </div>

            <Table
              columns={[
                {
                  header: "Cambio",
                  render: (h: HistorialEstadoResponse) => (
                    <span className="flex items-center gap-2">
                      {`${h.estadoAnterior ?? "—"} → ${h.estadoNuevo}`}
                      {h.idHistorial ===
                        historialMovimiento[historialMovimiento.length - 1]?.idHistorial && (
                        <Badge value="Actual" />
                      )}
                    </span>
                  ),
                },
                {
                  header: "Fecha",
                  render: (h: HistorialEstadoResponse) =>
                    new Date(h.fechaCambio).toLocaleString(),
                },
                {
                  header: "Observación",
                  render: (h: HistorialEstadoResponse) => h.observacion ?? "—",
                },
              ]}
              rows={historialMovimiento}
              keyFn={(h) => h.idHistorial}
              emptyLabel="Sin cambios de estado registrados todavía"
              rowClassName={(_h, index) =>
                index === historialMovimiento.length - 1 ? "bg-green-500/10" : ""
              }
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const idMov = movimientoSeleccionado.idMovimiento;
                run(() =>
                  cambiarEstadoMovimiento(idMov, {
                    nuevoEstado: nuevoEstadoMovimiento,
                    observacion: observacionMovimiento || undefined,
                  }).then(async (actualizado) => {
                    setMovimientoSeleccionado(actualizado);
                    setHistorialMovimiento(await getHistorialEstadosMovimiento(idMov));
                    setNuevoEstadoMovimiento("");
                    setObservacionMovimiento("");
                  })
                );
              }}
              className="flex items-end gap-3"
            >
              <Field label="Nuevo estado (texto libre, ej: recogido, en_transito, entregado)">
                <input
                  className={inputClass}
                  value={nuevoEstadoMovimiento}
                  onChange={(e) => setNuevoEstadoMovimiento(e.target.value)}
                  required
                />
              </Field>
              <Field label="Observación (opcional)">
                <input
                  className={inputClass}
                  value={observacionMovimiento}
                  onChange={(e) => setObservacionMovimiento(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>
                Cambiar estado
              </Button>
            </form>
          </div>
        )}
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

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  cambiarEstadoMovimiento,
  createSeguro,
  createVehiculo,
  darDeBajaActivo,
  deactivateActivo,
  deactivateSeguro,
  derivarIncidenteABaja,
  derivarIncidenteAMantenimiento,
  getActivo,
  getHistorialEstadosMovimiento,
  getHistorialTarifasActivo,
  getHistorialUbicaciones,
  getVehiculoByActivo,
  liberarMantenimientoActivo,
  listIncidentesByActivo,
  listLecturasVehiculo,
  listMovimientosByActivo,
  listSegurosByActivo,
  listSegurosInactivos,
  reactivarReingresoActivo,
  reactivateActivo,
  reactivateSeguro,
  registrarLecturaVehiculo,
  repotenciarCompletar,
  reportarIncidente,
  resolverIncidente,
  retornarMantenimiento,
  trasladarActivo,
  updateActivo,
  updateSeguro,
} from "@/lib/endpoints";
import type {
  ActivoResponse,
  ActivoVehiculoResponse,
  ContratoDetalleResponse,
  EstadoFisico,
  HistorialEstadoResponse,
  HistorialLecturaVehiculoResponse,
  HistorialUbicacionResponse,
  IncidenteActivoResponse,
  MovimientoResponse,
  SeguroActivoResponse,
  Severidad,
} from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

const ESTADOS_FISICOS: EstadoFisico[] = ["NUEVO", "SELLADO", "USADO", "REPARADO", "OBSOLETO"];
const SEVERIDADES: Severidad[] = ["LEVE", "MODERADO", "GRAVE"];

export default function ActivoDetallePage() {
  const params = useParams<{ id: string }>();
  const idActivo = Number(params.id);

  const [activo, setActivo] = useState<ActivoResponse | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoResponse[]>([]);
  const [ubicaciones, setUbicaciones] = useState<HistorialUbicacionResponse[]>([]);
  const [incidentes, setIncidentes] = useState<IncidenteActivoResponse[]>([]);
  const [historialTarifas, setHistorialTarifas] = useState<ContratoDetalleResponse[]>([]);
  const [seguros, setSeguros] = useState<SeguroActivoResponse[]>([]);
  const [vehiculo, setVehiculo] = useState<ActivoVehiculoResponse | null>(null);
  const [lecturas, setLecturas] = useState<HistorialLecturaVehiculoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mostrarReingreso, setMostrarReingreso] = useState(false);
  const [reingresoForm, setReingresoForm] = useState({
    sede: "",
    area: "",
    detalle: "",
    motivo: "",
  });

  const [editandoActivo, setEditandoActivo] = useState(false);
  const [activoEditForm, setActivoEditForm] = useState<{
    serie: string;
    descripcion: string;
    marca: string;
    modelo: string;
    color: string;
    especificaciones: string;
    criticidad: string;
    estadoFisico: EstadoFisico | "";
  }>({
    serie: "",
    descripcion: "",
    marca: "",
    modelo: "",
    color: "",
    especificaciones: "",
    criticidad: "",
    estadoFisico: "",
  });

  const [seguroForm, setSeguroForm] = useState({
    aseguradora: "",
    numeroPoliza: "",
    valorAsegurado: "",
    primaAnual: "",
    fechaInicio: "",
    fechaVencimiento: "",
  });
  const [seguroEditando, setSeguroEditando] = useState<SeguroActivoResponse | null>(null);
  const [seguroEditForm, setSeguroEditForm] = useState({
    aseguradora: "",
    numeroPoliza: "",
    valorAsegurado: "",
    primaAnual: "",
    fechaInicio: "",
    fechaVencimiento: "",
  });

  const [vehiculoForm, setVehiculoForm] = useState({
    placa: "",
    kilometrajeInicial: "",
    combustibleInicial: "",
    capacidadTanque: "",
  });
  const [lecturaForm, setLecturaForm] = useState({ kilometraje: "", combustible: "" });
  const [mostrarLecturas, setMostrarLecturas] = useState(false);

  const [trasladoForm, setTrasladoForm] = useState({
    sede: "",
    area: "",
    detalle: "",
    motivo: "",
  });
  const [bajaMotivo, setBajaMotivo] = useState("");
  const [repotenciarForm, setRepotenciarForm] = useState({
    tipoTarifa: "MENSUAL" as
      | "DIARIO"
      | "SEMANAL"
      | "MENSUAL"
      | "TRIMESTRAL"
      | "SEMESTRAL"
      | "ANUAL",
    precioBase: "",
    moneda: "USD" as "PEN" | "USD",
    sede: "",
    area: "",
    detalle: "",
  });
  const [retornoMantForm, setRetornoMantForm] = useState({
    sede: "",
    area: "",
    detalle: "",
  });
  const [liberarMantForm, setLiberarMantForm] = useState({
    sede: "",
    area: "",
    detalle: "",
  });
  const [incidenteForm, setIncidenteForm] = useState<{
    tipoIncidente: string;
    severidad: Severidad;
    descripcion: string;
  }>({
    tipoIncidente: "",
    severidad: "LEVE",
    descripcion: "",
  });
  const [movimientoSeleccionado, setMovimientoSeleccionado] =
    useState<MovimientoResponse | null>(null);
  const [historialMovimiento, setHistorialMovimiento] = useState<
    HistorialEstadoResponse[]
  >([]);
  const [nuevoEstadoMovimiento, setNuevoEstadoMovimiento] = useState("");
  const [observacionMovimiento, setObservacionMovimiento] = useState("");

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [a, m, ubic, i, tarifas, segsActivos, segsInactivos, veh] = await Promise.all([
        getActivo(idActivo),
        listMovimientosByActivo(idActivo),
        getHistorialUbicaciones(idActivo).catch(() => []),
        listIncidentesByActivo(idActivo),
        getHistorialTarifasActivo(idActivo).catch(() => []),
        listSegurosByActivo(idActivo).catch(() => []),
        listSegurosInactivos().catch(() => []),
        getVehiculoByActivo(idActivo).catch(() => null),
      ]);
      setActivo(a);
      setMovimientos(m);
      setUbicaciones(ubic);
      setIncidentes(i);
      setHistorialTarifas(tarifas);
      setSeguros([
        ...segsActivos,
        ...segsInactivos.filter((s) => s.idActivo === idActivo),
      ]);
      setVehiculo(veh);
      if (veh) {
        setLecturas(await listLecturasVehiculo(veh.idVehiculo).catch(() => []));
      } else {
        setLecturas([]);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isNaN(idActivo)) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idActivo]);

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

  async function verHistorialMovimiento(m: MovimientoResponse) {
    setError(null);
    try {
      setHistorialMovimiento(await getHistorialEstadosMovimiento(m.idMovimiento));
      setMovimientoSeleccionado(m);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  function abrirEdicionActivo() {
    if (!activo) return;
    setActivoEditForm({
      serie: activo.serie ?? "",
      descripcion: activo.descripcion ?? "",
      marca: activo.marca ?? "",
      modelo: activo.modelo ?? "",
      color: activo.color ?? "",
      especificaciones: activo.especificaciones ?? "",
      criticidad: activo.criticidad ?? "",
      estadoFisico: activo.estadoFisico ?? "",
    });
    setEditandoActivo(true);
  }

  function abrirEdicionSeguro(s: SeguroActivoResponse) {
    setSeguroEditando(s);
    setSeguroEditForm({
      aseguradora: s.aseguradora ?? "",
      numeroPoliza: s.numeroPoliza ?? "",
      valorAsegurado: s.valorAsegurado != null ? String(s.valorAsegurado) : "",
      primaAnual: s.primaAnual != null ? String(s.primaAnual) : "",
      fechaInicio: s.fechaInicio ?? "",
      fechaVencimiento: s.fechaVencimiento ?? "",
    });
  }

  if (loading) return <p className="text-sm text-neutral-500">Cargando...</p>;
  if (!activo) return <ErrorBanner message={error ?? "Activo no encontrado"} />;

  const enMantenimiento = activo.estadoOperativo?.toLowerCase() === "mantenimiento";
  const dadoDeBaja = activo.estadoOperativo?.toLowerCase() === "baja";
  const ultimoMovimiento = movimientos[0];
  const puedeVolverAContrato =
    enMantenimiento &&
    ultimoMovimiento?.tipoMov === "MANTENIMIENTO" &&
    ultimoMovimiento?.idDetalleContrato != null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{activo.codigoInterno}</h1>
        <p className="text-sm text-neutral-500">{activo.descripcion}</p>
      </div>
      <ErrorBanner message={error} />

      <Card
        title="Datos generales"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={abrirEdicionActivo}>
              Editar
            </Button>
            {activo.activo === false ? (
              dadoDeBaja ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReingresoForm({ sede: "", area: "", detalle: "", motivo: "" });
                    setMostrarReingreso(true);
                  }}
                >
                  Reactivar y reingresar
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={() => run(() => reactivateActivo(idActivo))}
                >
                  Reactivar
                </Button>
              )
            ) : (
              <Button
                variant="danger"
                loading={busy}
                onClick={() => run(() => deactivateActivo(idActivo))}
              >
                Desactivar
              </Button>
            )}
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-neutral-500">Tipo de producto</dt>
            <dd>{activo.tipoProductoNombre ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Estado operativo</dt>
            <dd>
              <Badge value={activo.estadoOperativo} />
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Marca / Modelo</dt>
            <dd>
              {[activo.marca, activo.modelo].filter(Boolean).join(" / ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Activo</dt>
            <dd>
              <Badge value={activo.activo} />
            </dd>
          </div>
        </dl>

        {editandoActivo && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                updateActivo(idActivo, {
                  ...activoEditForm,
                  serie: activoEditForm.serie || undefined,
                  marca: activoEditForm.marca || undefined,
                  modelo: activoEditForm.modelo || undefined,
                  color: activoEditForm.color || undefined,
                  especificaciones: activoEditForm.especificaciones || undefined,
                  criticidad: activoEditForm.criticidad || undefined,
                  estadoFisico: activoEditForm.estadoFisico || undefined,
                }).then(() => setEditandoActivo(false))
              );
            }}
            className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          >
            <p className="text-sm font-medium">Editar datos del activo</p>
            <Field label="Descripción">
              <input
                className={inputClass}
                value={activoEditForm.descripcion}
                onChange={(e) =>
                  setActivoEditForm({ ...activoEditForm, descripcion: e.target.value })
                }
              />
            </Field>
            <Field label="Marca">
              <input
                className={inputClass}
                value={activoEditForm.marca}
                onChange={(e) =>
                  setActivoEditForm({ ...activoEditForm, marca: e.target.value })
                }
              />
            </Field>
            <Field label="Modelo">
              <input
                className={inputClass}
                value={activoEditForm.modelo}
                onChange={(e) =>
                  setActivoEditForm({ ...activoEditForm, modelo: e.target.value })
                }
              />
            </Field>
            <Field label="Serie">
              <input
                className={inputClass}
                value={activoEditForm.serie}
                onChange={(e) =>
                  setActivoEditForm({ ...activoEditForm, serie: e.target.value })
                }
              />
            </Field>
            <Field label="Criticidad">
              <input
                className={inputClass}
                value={activoEditForm.criticidad}
                onChange={(e) =>
                  setActivoEditForm({ ...activoEditForm, criticidad: e.target.value })
                }
              />
            </Field>
            <Field label="Estado físico">
              <select
                className={inputClass}
                value={activoEditForm.estadoFisico}
                onChange={(e) =>
                  setActivoEditForm({
                    ...activoEditForm,
                    estadoFisico: e.target.value as EstadoFisico | "",
                  })
                }
              >
                <option value="">Sin definir</option>
                {ESTADOS_FISICOS.map((ef) => (
                  <option key={ef} value={ef}>
                    {ef}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>
                Guardar cambios
              </Button>
              <Button variant="ghost" onClick={() => setEditandoActivo(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {mostrarReingreso && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                reactivarReingresoActivo(idActivo, {
                  sede: reingresoForm.sede,
                  area: reingresoForm.area,
                  detalle: reingresoForm.detalle || undefined,
                  motivo: reingresoForm.motivo || undefined,
                }).then(() => setMostrarReingreso(false))
              );
            }}
            className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          >
            <p className="text-sm font-medium">
              Reactivar y reingresar (el activo estaba dado de baja)
            </p>
            <p className="text-xs text-neutral-500">
              Deja el activo `disponible` de nuevo y registra su ingreso con la
              ubicación indicada.
            </p>
            <Field label="Sede">
              <input
                className={inputClass}
                value={reingresoForm.sede}
                onChange={(e) =>
                  setReingresoForm({ ...reingresoForm, sede: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Área">
              <input
                className={inputClass}
                value={reingresoForm.area}
                onChange={(e) =>
                  setReingresoForm({ ...reingresoForm, area: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Detalle (opcional)">
              <input
                className={inputClass}
                value={reingresoForm.detalle}
                onChange={(e) =>
                  setReingresoForm({ ...reingresoForm, detalle: e.target.value })
                }
              />
            </Field>
            <Field label="Motivo (opcional)">
              <input
                className={inputClass}
                value={reingresoForm.motivo}
                onChange={(e) =>
                  setReingresoForm({ ...reingresoForm, motivo: e.target.value })
                }
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>
                Reactivar y reingresar
              </Button>
              <Button variant="ghost" onClick={() => setMostrarReingreso(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Historial de tarifas">
        <Table
          columns={[
            {
              header: "Contrato",
              render: (d: ContratoDetalleResponse) => `#${d.idDetalle}`,
            },
            {
              header: "Tarifa",
              render: (d: ContratoDetalleResponse) =>
                `${d.tipoTarifa} · ${d.precioFinal} ${d.moneda}`,
            },
            {
              header: "Responsable",
              render: (d: ContratoDetalleResponse) => d.nombreResponsable ?? "—",
            },
            {
              header: "Vigencia",
              render: (d: ContratoDetalleResponse) =>
                `${d.fechaInicioAlquiler} → ${d.fechaFinReal ?? d.fechaFinPrevista ?? "en curso"}`,
            },
            {
              header: "Estado",
              render: (d: ContratoDetalleResponse) => <Badge value={d.activo} />,
            },
          ]}
          rows={historialTarifas}
          keyFn={(d) => d.idDetalle}
          emptyLabel="Este activo todavía no tuvo tarifas asignadas en ningún contrato"
        />
      </Card>

      <Card title="Seguros">
        <Table
          columns={[
            {
              header: "Aseguradora",
              render: (s: SeguroActivoResponse) => s.aseguradora ?? "—",
            },
            {
              header: "Póliza",
              render: (s: SeguroActivoResponse) => s.numeroPoliza ?? "—",
            },
            {
              header: "Vigencia",
              render: (s: SeguroActivoResponse) =>
                `${s.fechaInicio ?? "—"} → ${s.fechaVencimiento ?? "—"}`,
            },
            {
              header: "Estado",
              render: (s: SeguroActivoResponse) => <Badge value={s.activo} />,
            },
            {
              header: "Acciones",
              render: (s: SeguroActivoResponse) => (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => abrirEdicionSeguro(s)}>
                    Editar
                  </Button>
                  {s.activo === false ? (
                    <Button
                      variant="secondary"
                      loading={busy}
                      onClick={() => run(() => reactivateSeguro(s.idSeguro))}
                    >
                      Reactivar
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      loading={busy}
                      onClick={() => run(() => deactivateSeguro(s.idSeguro))}
                    >
                      Desactivar
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={seguros}
          keyFn={(s) => s.idSeguro}
          emptyLabel="Este activo todavía no tiene seguros registrados"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              createSeguro({
                idActivo,
                aseguradora: seguroForm.aseguradora,
                numeroPoliza: seguroForm.numeroPoliza,
                valorAsegurado: seguroForm.valorAsegurado
                  ? Number(seguroForm.valorAsegurado)
                  : undefined,
                primaAnual: seguroForm.primaAnual ? Number(seguroForm.primaAnual) : undefined,
                fechaInicio: seguroForm.fechaInicio || undefined,
                fechaVencimiento: seguroForm.fechaVencimiento || undefined,
              }).then(() =>
                setSeguroForm({
                  aseguradora: "",
                  numeroPoliza: "",
                  valorAsegurado: "",
                  primaAnual: "",
                  fechaInicio: "",
                  fechaVencimiento: "",
                })
              )
            );
          }}
          className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
        >
          <p className="text-sm font-medium">Registrar seguro</p>
          <Field label="Aseguradora">
            <input
              className={inputClass}
              value={seguroForm.aseguradora}
              onChange={(e) => setSeguroForm({ ...seguroForm, aseguradora: e.target.value })}
              required
            />
          </Field>
          <Field label="Número de póliza">
            <input
              className={inputClass}
              value={seguroForm.numeroPoliza}
              onChange={(e) => setSeguroForm({ ...seguroForm, numeroPoliza: e.target.value })}
            />
          </Field>
          <Field label="Valor asegurado">
            <input
              type="number"
              className={inputClass}
              value={seguroForm.valorAsegurado}
              onChange={(e) =>
                setSeguroForm({ ...seguroForm, valorAsegurado: e.target.value })
              }
            />
          </Field>
          <Field label="Prima anual">
            <input
              type="number"
              className={inputClass}
              value={seguroForm.primaAnual}
              onChange={(e) => setSeguroForm({ ...seguroForm, primaAnual: e.target.value })}
            />
          </Field>
          <Field label="Fecha inicio">
            <input
              type="date"
              className={inputClass}
              value={seguroForm.fechaInicio}
              onChange={(e) => setSeguroForm({ ...seguroForm, fechaInicio: e.target.value })}
            />
          </Field>
          <Field label="Fecha vencimiento">
            <input
              type="date"
              className={inputClass}
              value={seguroForm.fechaVencimiento}
              onChange={(e) =>
                setSeguroForm({ ...seguroForm, fechaVencimiento: e.target.value })
              }
            />
          </Field>
          <Button type="submit" loading={busy}>
            Registrar seguro
          </Button>
        </form>
      </Card>

      {seguroEditando && (
        <Card
          title={`Editar seguro: ${seguroEditando.numeroPoliza ?? seguroEditando.idSeguro}`}
          action={
            <Button variant="ghost" onClick={() => setSeguroEditando(null)}>
              Cerrar
            </Button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                updateSeguro(seguroEditando.idSeguro, {
                  aseguradora: seguroEditForm.aseguradora,
                  numeroPoliza: seguroEditForm.numeroPoliza,
                  valorAsegurado: seguroEditForm.valorAsegurado
                    ? Number(seguroEditForm.valorAsegurado)
                    : undefined,
                  primaAnual: seguroEditForm.primaAnual
                    ? Number(seguroEditForm.primaAnual)
                    : undefined,
                  fechaInicio: seguroEditForm.fechaInicio || undefined,
                  fechaVencimiento: seguroEditForm.fechaVencimiento || undefined,
                })
              );
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Aseguradora">
              <input
                className={inputClass}
                value={seguroEditForm.aseguradora}
                onChange={(e) =>
                  setSeguroEditForm({ ...seguroEditForm, aseguradora: e.target.value })
                }
              />
            </Field>
            <Field label="Número de póliza">
              <input
                className={inputClass}
                value={seguroEditForm.numeroPoliza}
                onChange={(e) =>
                  setSeguroEditForm({ ...seguroEditForm, numeroPoliza: e.target.value })
                }
              />
            </Field>
            <Field label="Valor asegurado">
              <input
                type="number"
                className={inputClass}
                value={seguroEditForm.valorAsegurado}
                onChange={(e) =>
                  setSeguroEditForm({ ...seguroEditForm, valorAsegurado: e.target.value })
                }
              />
            </Field>
            <Field label="Prima anual">
              <input
                type="number"
                className={inputClass}
                value={seguroEditForm.primaAnual}
                onChange={(e) =>
                  setSeguroEditForm({ ...seguroEditForm, primaAnual: e.target.value })
                }
              />
            </Field>
            <Field label="Fecha inicio">
              <input
                type="date"
                className={inputClass}
                value={seguroEditForm.fechaInicio}
                onChange={(e) =>
                  setSeguroEditForm({ ...seguroEditForm, fechaInicio: e.target.value })
                }
              />
            </Field>
            <Field label="Fecha vencimiento">
              <input
                type="date"
                className={inputClass}
                value={seguroEditForm.fechaVencimiento}
                onChange={(e) =>
                  setSeguroEditForm({ ...seguroEditForm, fechaVencimiento: e.target.value })
                }
              />
            </Field>
            <Button type="submit" loading={busy}>
              Guardar cambios
            </Button>
          </form>
        </Card>
      )}

      {(activo.esVehicular || vehiculo) && (
      <Card title="Ficha vehicular">
        {vehiculo ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-neutral-500">Placa</dt>
                <dd>{vehiculo.placa ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Kilometraje actual</dt>
                <dd>{vehiculo.kilometrajeActual ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Combustible actual</dt>
                <dd>{vehiculo.combustibleActual ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Última lectura</dt>
                <dd>{vehiculo.fechaUltimaLectura ?? "—"}</dd>
              </div>
            </dl>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  registrarLecturaVehiculo(vehiculo.idVehiculo, {
                    kilometraje: lecturaForm.kilometraje
                      ? Number(lecturaForm.kilometraje)
                      : undefined,
                    combustible: lecturaForm.combustible
                      ? Number(lecturaForm.combustible)
                      : undefined,
                  }).then(() => setLecturaForm({ kilometraje: "", combustible: "" }))
                );
              }}
              className="flex items-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
            >
              <Field label="Kilometraje">
                <input
                  type="number"
                  className={inputClass}
                  value={lecturaForm.kilometraje}
                  onChange={(e) =>
                    setLecturaForm({ ...lecturaForm, kilometraje: e.target.value })
                  }
                />
              </Field>
              <Field label="Combustible">
                <input
                  type="number"
                  className={inputClass}
                  value={lecturaForm.combustible}
                  onChange={(e) =>
                    setLecturaForm({ ...lecturaForm, combustible: e.target.value })
                  }
                />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>
                Registrar lectura
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMostrarLecturas((v) => !v)}
              >
                {mostrarLecturas ? "Ocultar historial" : "Ver historial de lecturas"}
              </Button>
            </form>

            {mostrarLecturas && (
              <Table
                columns={[
                  {
                    header: "Fecha",
                    render: (l: HistorialLecturaVehiculoResponse) =>
                      new Date(l.fechaRegistro).toLocaleString(),
                  },
                  {
                    header: "Kilometraje",
                    render: (l: HistorialLecturaVehiculoResponse) => l.kilometraje ?? "—",
                  },
                  {
                    header: "Combustible",
                    render: (l: HistorialLecturaVehiculoResponse) => l.combustible ?? "—",
                  },
                ]}
                rows={lecturas}
                keyFn={(l) => l.idLectura}
                emptyLabel="Sin lecturas registradas"
              />
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                createVehiculo({
                  idActivo,
                  placa: vehiculoForm.placa,
                  kilometrajeInicial: vehiculoForm.kilometrajeInicial
                    ? Number(vehiculoForm.kilometrajeInicial)
                    : undefined,
                  combustibleInicial: vehiculoForm.combustibleInicial
                    ? Number(vehiculoForm.combustibleInicial)
                    : undefined,
                  capacidadTanque: vehiculoForm.capacidadTanque
                    ? Number(vehiculoForm.capacidadTanque)
                    : undefined,
                })
              );
            }}
            className="flex flex-col gap-3"
          >
            <p className="text-sm text-neutral-500">
              Este activo todavía no tiene ficha vehicular. Créala si corresponde
              (solo para activos tipo vehículo).
            </p>
            <Field label="Placa">
              <input
                className={inputClass}
                value={vehiculoForm.placa}
                onChange={(e) => setVehiculoForm({ ...vehiculoForm, placa: e.target.value })}
                required
              />
            </Field>
            <Field label="Kilometraje inicial">
              <input
                type="number"
                className={inputClass}
                value={vehiculoForm.kilometrajeInicial}
                onChange={(e) =>
                  setVehiculoForm({ ...vehiculoForm, kilometrajeInicial: e.target.value })
                }
              />
            </Field>
            <Field label="Capacidad de tanque">
              <input
                type="number"
                className={inputClass}
                value={vehiculoForm.capacidadTanque}
                onChange={(e) =>
                  setVehiculoForm({ ...vehiculoForm, capacidadTanque: e.target.value })
                }
              />
            </Field>
            <Button type="submit" loading={busy}>
              Crear ficha vehicular
            </Button>
          </form>
        )}
      </Card>
      )}

      <Card title="Historial de ubicaciones">
        <Table
          columns={[
            { header: "Sede", render: (u: HistorialUbicacionResponse) => u.sede ?? "—" },
            { header: "Área", render: (u: HistorialUbicacionResponse) => u.area ?? "—" },
            { header: "Detalle", render: (u: HistorialUbicacionResponse) => u.detalle ?? "—" },
            {
              header: "Desde",
              render: (u: HistorialUbicacionResponse) =>
                new Date(u.fechaDesde).toLocaleString(),
            },
            {
              header: "Hasta",
              render: (u: HistorialUbicacionResponse) =>
                u.fechaHasta ? (
                  new Date(u.fechaHasta).toLocaleString()
                ) : (
                  <Badge value="Actual" />
                ),
            },
          ]}
          rows={ubicaciones}
          keyFn={(u) => u.idHistorial}
          emptyLabel="Este activo todavía no tiene historial de ubicaciones"
        />
      </Card>

      <Card title="Historial de movimientos">
        <Table
          columns={[
            {
              header: "Tipo",
              render: (m: MovimientoResponse) => <Badge value={m.tipoMov} />,
            },
            {
              header: "Estado",
              render: (m: MovimientoResponse) => <Badge value={m.estadoActual} />,
            },
            { header: "Motivo", render: (m: MovimientoResponse) => m.motivo ?? "—" },
            {
              header: "Fecha",
              render: (m: MovimientoResponse) =>
                new Date(m.fechaMovimiento).toLocaleString(),
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
          emptyLabel="Este activo todavía no tiene movimientos"
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

      <Card title="Incidentes">
        <Table
          columns={[
            {
              header: "Tipo",
              render: (i: IncidenteActivoResponse) => i.tipoIncidente,
            },
            {
              header: "Estado",
              render: (i: IncidenteActivoResponse) => <Badge value={i.estadoIncidente} />,
            },
            {
              header: "Descripción",
              render: (i: IncidenteActivoResponse) => i.descripcion ?? "—",
            },
            {
              header: "Acciones",
              render: (i: IncidenteActivoResponse) =>
                i.estadoIncidente?.toUpperCase() === "REPORTADO" ? (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        run(() =>
                          derivarIncidenteAMantenimiento(i.idIncidente, {})
                        )
                      }
                    >
                      A mantenimiento
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        run(() =>
                          derivarIncidenteABaja(i.idIncidente, {
                            motivo: `Baja por incidente: ${i.tipoIncidente}`,
                          })
                        )
                      }
                    >
                      Dar de baja
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => run(() => resolverIncidente(i.idIncidente, {}))}
                    >
                      Resolver
                    </Button>
                  </div>
                ) : (
                  "—"
                ),
            },
          ]}
          rows={incidentes}
          keyFn={(i) => i.idIncidente}
          emptyLabel="Este activo todavía no tiene incidentes reportados"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              reportarIncidente({ idActivo, ...incidenteForm }).then(() =>
                setIncidenteForm({ tipoIncidente: "", severidad: "LEVE", descripcion: "" })
              )
            );
          }}
          className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
        >
          <p className="text-sm font-medium">Reportar incidente</p>
          <Field label="Tipo (ej: falla, golpe, robo, pérdida, accidente, desgaste)">
            <input
              className={inputClass}
              value={incidenteForm.tipoIncidente}
              onChange={(e) =>
                setIncidenteForm({ ...incidenteForm, tipoIncidente: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Severidad">
            <select
              className={inputClass}
              value={incidenteForm.severidad}
              onChange={(e) =>
                setIncidenteForm({
                  ...incidenteForm,
                  severidad: e.target.value as Severidad,
                })
              }
            >
              {SEVERIDADES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={incidenteForm.descripcion}
              onChange={(e) =>
                setIncidenteForm({ ...incidenteForm, descripcion: e.target.value })
              }
            />
          </Field>
          <Button type="submit" loading={busy}>
            Reportar incidente
          </Button>
        </form>
      </Card>

      <Card
        title="Acciones"
        description={
          enMantenimiento && !puedeVolverAContrato
            ? "Retornar/Repotenciar solo aparecen si este activo llegó a mantenimiento estando alquilado en un contrato todavía vigente. Si no, usá 'Liberar a disponible'."
            : undefined
        }
      >
        <div className="flex flex-col gap-6">
          {puedeVolverAContrato && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  retornarMantenimiento(idActivo, {
                    sede: retornoMantForm.sede,
                    area: retornoMantForm.area,
                    detalle: retornoMantForm.detalle || undefined,
                  })
                );
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium">
                Retornar de mantenimiento (mismo precio de antes)
              </p>
              <Field label="Sede">
                <input
                  className={inputClass}
                  value={retornoMantForm.sede}
                  onChange={(e) =>
                    setRetornoMantForm({ ...retornoMantForm, sede: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Área">
                <input
                  className={inputClass}
                  value={retornoMantForm.area}
                  onChange={(e) =>
                    setRetornoMantForm({ ...retornoMantForm, area: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Detalle (opcional)">
                <input
                  className={inputClass}
                  value={retornoMantForm.detalle}
                  onChange={(e) =>
                    setRetornoMantForm({ ...retornoMantForm, detalle: e.target.value })
                  }
                />
              </Field>
              <Button type="submit" loading={busy}>
                Retornar de mantenimiento
              </Button>
            </form>
          )}

          {puedeVolverAContrato && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  repotenciarCompletar(idActivo, {
                    tipoTarifa: repotenciarForm.tipoTarifa,
                    precioBase: Number(repotenciarForm.precioBase),
                    moneda: repotenciarForm.moneda,
                    sede: repotenciarForm.sede,
                    area: repotenciarForm.area,
                    detalle: repotenciarForm.detalle || undefined,
                  })
                );
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium">
                Repotenciar (mismo activo, vuelve con precio nuevo)
              </p>
              <Field label="Tipo de tarifa">
                <select
                  className={inputClass}
                  value={repotenciarForm.tipoTarifa}
                  onChange={(e) =>
                    setRepotenciarForm({
                      ...repotenciarForm,
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
              <Field label="Nuevo precio base">
                <input
                  type="number"
                  className={inputClass}
                  value={repotenciarForm.precioBase}
                  onChange={(e) =>
                    setRepotenciarForm({
                      ...repotenciarForm,
                      precioBase: e.target.value,
                    })
                  }
                  required
                />
              </Field>
              <Field label="Sede">
                <input
                  className={inputClass}
                  value={repotenciarForm.sede}
                  onChange={(e) =>
                    setRepotenciarForm({ ...repotenciarForm, sede: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Área">
                <input
                  className={inputClass}
                  value={repotenciarForm.area}
                  onChange={(e) =>
                    setRepotenciarForm({ ...repotenciarForm, area: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Detalle (opcional)">
                <input
                  className={inputClass}
                  value={repotenciarForm.detalle}
                  onChange={(e) =>
                    setRepotenciarForm({ ...repotenciarForm, detalle: e.target.value })
                  }
                />
              </Field>
              <Button type="submit" loading={busy}>
                Repotenciar
              </Button>
            </form>
          )}

          {enMantenimiento && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  liberarMantenimientoActivo(idActivo, {
                    sede: liberarMantForm.sede,
                    area: liberarMantForm.area,
                    detalle: liberarMantForm.detalle || undefined,
                  })
                );
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium">
                Liberar a disponible (no vuelve a ningún contrato)
              </p>
              <Field label="Sede">
                <input
                  className={inputClass}
                  value={liberarMantForm.sede}
                  onChange={(e) =>
                    setLiberarMantForm({ ...liberarMantForm, sede: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Área">
                <input
                  className={inputClass}
                  value={liberarMantForm.area}
                  onChange={(e) =>
                    setLiberarMantForm({ ...liberarMantForm, area: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Detalle (opcional)">
                <input
                  className={inputClass}
                  value={liberarMantForm.detalle}
                  onChange={(e) =>
                    setLiberarMantForm({ ...liberarMantForm, detalle: e.target.value })
                  }
                />
              </Field>
              <Button type="submit" loading={busy}>
                Liberar a disponible
              </Button>
            </form>
          )}

          {!dadoDeBaja && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  trasladarActivo(idActivo, {
                    ...trasladoForm,
                    detalle: trasladoForm.detalle || undefined,
                  })
                );
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium">Trasladar</p>
              <Field label="Sede de destino">
                <input
                  className={inputClass}
                  value={trasladoForm.sede}
                  onChange={(e) =>
                    setTrasladoForm({ ...trasladoForm, sede: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Área de destino">
                <input
                  className={inputClass}
                  value={trasladoForm.area}
                  onChange={(e) =>
                    setTrasladoForm({ ...trasladoForm, area: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Detalle de destino (opcional)">
                <input
                  className={inputClass}
                  value={trasladoForm.detalle}
                  onChange={(e) =>
                    setTrasladoForm({ ...trasladoForm, detalle: e.target.value })
                  }
                />
              </Field>
              <Field label="Motivo">
                <input
                  className={inputClass}
                  value={trasladoForm.motivo}
                  onChange={(e) =>
                    setTrasladoForm({ ...trasladoForm, motivo: e.target.value })
                  }
                />
              </Field>
              <Button type="submit" loading={busy}>
                Trasladar activo
              </Button>
            </form>
          )}

          {!dadoDeBaja && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => darDeBajaActivo(idActivo, { motivo: bajaMotivo }));
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm font-medium">Dar de baja</p>
              <Field label="Motivo">
                <input
                  className={inputClass}
                  value={bajaMotivo}
                  onChange={(e) => setBajaMotivo(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" variant="danger" loading={busy}>
                Dar de baja definitivamente
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

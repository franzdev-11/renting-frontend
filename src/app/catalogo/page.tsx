"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createClase,
  createTipoProducto,
  deactivateClase,
  deactivateTipoProducto,
  listClases,
  listClasesInactivas,
  listTipos,
  listTiposInactivos,
  reactivateClase,
  reactivateTipoProducto,
  updateClase,
  updateTipoProducto,
} from "@/lib/endpoints";
import type { ClaseActivoResponse, TipoProductoResponse } from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

export default function CatalogoPage() {
  const [clases, setClases] = useState<ClaseActivoResponse[]>([]);
  const [tipos, setTipos] = useState<TipoProductoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [claseForm, setClaseForm] = useState({
    nombre: "",
    descripcion: "",
    esVehicular: false,
  });
  const [creatingClase, setCreatingClase] = useState(false);

  const [tipoForm, setTipoForm] = useState({ claseId: "", nombre: "", descripcion: "" });
  const [creatingTipo, setCreatingTipo] = useState(false);

  const [claseEditando, setClaseEditando] = useState<ClaseActivoResponse | null>(null);
  const [claseEditForm, setClaseEditForm] = useState({
    nombre: "",
    descripcion: "",
    esVehicular: false,
  });

  const [tipoEditando, setTipoEditando] = useState<TipoProductoResponse | null>(null);
  const [tipoEditForm, setTipoEditForm] = useState({ claseId: "", nombre: "", descripcion: "" });

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const [c, t, ci, ti] = await Promise.all([
        listClases(),
        listTipos(),
        listClasesInactivas().catch(() => []),
        listTiposInactivos().catch(() => []),
      ]);
      setClases([...c, ...ci]);
      setTipos([...t, ...ti]);
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
      setClaseEditando(null);
      setTipoEditando(null);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCrearClase(e: React.FormEvent) {
    e.preventDefault();
    setCreatingClase(true);
    setError(null);
    try {
      await createClase(claseForm);
      setClaseForm({ nombre: "", descripcion: "", esVehicular: false });
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCreatingClase(false);
    }
  }

  async function handleCrearTipo(e: React.FormEvent) {
    e.preventDefault();
    setCreatingTipo(true);
    setError(null);
    try {
      await createTipoProducto({
        claseId: Number(tipoForm.claseId),
        nombre: tipoForm.nombre,
        descripcion: tipoForm.descripcion,
      });
      setTipoForm({ claseId: "", nombre: "", descripcion: "" });
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCreatingTipo(false);
    }
  }

  function nombreClase(id: number) {
    return clases.find((c) => c.id === id)?.nombre ?? `#${id}`;
  }

  // La tabla muestra clases activas E inactivas (para poder reactivarlas),
  // pero los selects de "elegir clase" para crear/editar un tipo de
  // producto solo deben ofrecer clases activas -- si no, se podía asignar
  // un tipo nuevo a una clase desactivada. Al editar, además se incluye la
  // clase actual del tipo aunque esté inactiva, para que no desaparezca del
  // select justo la opción ya seleccionada.
  const clasesParaCrear = clases.filter((c) => c.activo !== false);
  const clasesParaEditar = clases.filter(
    (c) => c.activo !== false || String(c.id) === tipoEditForm.claseId
  );

  function abrirEdicionClase(c: ClaseActivoResponse) {
    setClaseEditando(c);
    setClaseEditForm({
      nombre: c.nombre,
      descripcion: c.descripcion ?? "",
      esVehicular: c.esVehicular ?? false,
    });
  }

  function abrirEdicionTipo(t: TipoProductoResponse) {
    setTipoEditando(t);
    setTipoEditForm({
      claseId: String(t.claseId),
      nombre: t.nombre,
      descripcion: t.descripcion ?? "",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Catálogo</h1>
      <ErrorBanner message={error} />

      <Card title="Clases de activo">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              { header: "Nombre", render: (c: ClaseActivoResponse) => c.nombre },
              {
                header: "Descripción",
                render: (c: ClaseActivoResponse) => c.descripcion ?? "—",
              },
              {
                header: "Vehicular",
                render: (c: ClaseActivoResponse) => <Badge value={c.esVehicular ?? false} />,
              },
              {
                header: "Estado",
                render: (c: ClaseActivoResponse) => <Badge value={c.activo ?? true} />,
              },
              {
                header: "Acciones",
                render: (c: ClaseActivoResponse) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => abrirEdicionClase(c)}>
                      Editar
                    </Button>
                    {c.activo === false ? (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() => run(() => reactivateClase(c.id))}
                      >
                        Reactivar
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        loading={busy}
                        onClick={() => run(() => deactivateClase(c.id))}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={clases}
            keyFn={(c) => c.id}
          />
        )}
        <form onSubmit={handleCrearClase} className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Field label="Nombre">
            <input
              className={inputClass}
              value={claseForm.nombre}
              onChange={(e) => setClaseForm({ ...claseForm, nombre: e.target.value })}
              required
            />
          </Field>
          <Field label="Descripción">
            <input
              className={inputClass}
              value={claseForm.descripcion}
              onChange={(e) => setClaseForm({ ...claseForm, descripcion: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={claseForm.esVehicular}
              onChange={(e) =>
                setClaseForm({ ...claseForm, esVehicular: e.target.checked })
              }
            />
            Es una clase vehicular (habilita la ficha de placa/combustible/kilometraje
            en los activos de esta clase)
          </label>
          <Button type="submit" loading={creatingClase}>
            Crear clase
          </Button>
        </form>
      </Card>

      {claseEditando && (
        <Card
          title={`Editar clase: ${claseEditando.nombre}`}
          action={
            <Button variant="ghost" onClick={() => setClaseEditando(null)}>
              Cerrar
            </Button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateClase(claseEditando.id, claseEditForm));
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Nombre">
              <input
                className={inputClass}
                value={claseEditForm.nombre}
                onChange={(e) => setClaseEditForm({ ...claseEditForm, nombre: e.target.value })}
                required
              />
            </Field>
            <Field label="Descripción">
              <input
                className={inputClass}
                value={claseEditForm.descripcion}
                onChange={(e) =>
                  setClaseEditForm({ ...claseEditForm, descripcion: e.target.value })
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={claseEditForm.esVehicular}
                onChange={(e) =>
                  setClaseEditForm({ ...claseEditForm, esVehicular: e.target.checked })
                }
              />
              Es una clase vehicular
            </label>
            <Button type="submit" loading={busy}>
              Guardar cambios
            </Button>
          </form>
        </Card>
      )}

      <Card title="Tipos de producto">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              { header: "Nombre", render: (t: TipoProductoResponse) => t.nombre },
              {
                header: "Clase",
                render: (t: TipoProductoResponse) => t.claseNombre ?? nombreClase(t.claseId),
              },
              {
                header: "Estado",
                render: (t: TipoProductoResponse) => <Badge value={t.activo ?? true} />,
              },
              {
                header: "Acciones",
                render: (t: TipoProductoResponse) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => abrirEdicionTipo(t)}>
                      Editar
                    </Button>
                    {t.activo === false ? (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() => run(() => reactivateTipoProducto(t.id))}
                      >
                        Reactivar
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        loading={busy}
                        onClick={() => run(() => deactivateTipoProducto(t.id))}
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={tipos}
            keyFn={(t) => t.id}
          />
        )}
        <form onSubmit={handleCrearTipo} className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Field label="Clase">
            <select
              className={inputClass}
              value={tipoForm.claseId}
              onChange={(e) => setTipoForm({ ...tipoForm, claseId: e.target.value })}
              required
            >
              <option value="" disabled>
                Selecciona una clase
              </option>
              {clasesParaCrear.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nombre">
            <input
              className={inputClass}
              value={tipoForm.nombre}
              onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })}
              required
            />
          </Field>
          <Button type="submit" loading={creatingTipo} disabled={clasesParaCrear.length === 0}>
            Crear tipo de producto
          </Button>
        </form>
      </Card>

      {tipoEditando && (
        <Card
          title={`Editar tipo de producto: ${tipoEditando.nombre}`}
          action={
            <Button variant="ghost" onClick={() => setTipoEditando(null)}>
              Cerrar
            </Button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                updateTipoProducto(tipoEditando.id, {
                  claseId: Number(tipoEditForm.claseId),
                  nombre: tipoEditForm.nombre,
                  descripcion: tipoEditForm.descripcion,
                })
              );
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Clase">
              <select
                className={inputClass}
                value={tipoEditForm.claseId}
                onChange={(e) => setTipoEditForm({ ...tipoEditForm, claseId: e.target.value })}
                required
              >
                {clasesParaEditar.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.activo === false ? " (inactiva)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre">
              <input
                className={inputClass}
                value={tipoEditForm.nombre}
                onChange={(e) => setTipoEditForm({ ...tipoEditForm, nombre: e.target.value })}
                required
              />
            </Field>
            <Field label="Descripción">
              <input
                className={inputClass}
                value={tipoEditForm.descripcion}
                onChange={(e) =>
                  setTipoEditForm({ ...tipoEditForm, descripcion: e.target.value })
                }
              />
            </Field>
            <Button type="submit" loading={busy}>
              Guardar cambios
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

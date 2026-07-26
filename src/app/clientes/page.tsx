"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  createCliente,
  createResponsable,
  deactivateCliente,
  deactivateResponsable,
  listClientes,
  listClientesInactivos,
  listResponsablesByCliente,
  listResponsablesInactivos,
  reactivateCliente,
  reactivateResponsable,
  updateCliente,
  updateResponsable,
} from "@/lib/endpoints";
import type { ClienteResponse, ResponsableResponse } from "@/lib/types";
import { Badge, Button, Card, ErrorBanner, Field, Table, inputClass } from "@/components/ui";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [clienteForm, setClienteForm] = useState({
    ruc: "",
    razonSocial: "",
    tipoPersona: "JURIDICA",
    regulada: false,
  });
  const [creatingCliente, setCreatingCliente] = useState(false);

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteResponse | null>(null);
  const [responsables, setResponsables] = useState<ResponsableResponse[]>([]);
  const [responsableForm, setResponsableForm] = useState({
    nombreCompleto: "",
    cargo: "",
  });
  const [creatingResponsable, setCreatingResponsable] = useState(false);

  const [clienteEditando, setClienteEditando] = useState<ClienteResponse | null>(null);
  const [clienteEditForm, setClienteEditForm] = useState({
    razonSocial: "",
    tipoPersona: "",
    estadoSunat: "",
    sectorGiro: "",
    representanteLegal: "",
    telefonoContacto: "",
    regulada: false,
  });

  const [responsableEditando, setResponsableEditando] =
    useState<ResponsableResponse | null>(null);
  const [responsableEditForm, setResponsableEditForm] = useState({
    dniRuc: "",
    nombreCompleto: "",
    telefono: "",
    email: "",
    cargo: "",
  });

  async function cargarClientes() {
    setLoading(true);
    setError(null);
    try {
      const [activos, inactivos] = await Promise.all([
        listClientes(),
        listClientesInactivos().catch(() => []),
      ]);
      setClientes([...activos, ...inactivos]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  async function cargarResponsables(idCliente: number) {
    const [activos, inactivos] = await Promise.all([
      // Defensivo: si el cliente está desactivado, este endpoint ya no
      // debería rechazar la consulta (se corrigió en el backend), pero se
      // deja el catch por si el backend corriendo todavía es una versión
      // vieja sin el fix.
      listResponsablesByCliente(idCliente).catch(() => []),
      listResponsablesInactivos().catch(() => []),
    ]);
    return [...activos, ...inactivos.filter((r) => r.clienteId === idCliente)];
  }

  async function run(action: () => Promise<unknown>, refreshResponsables?: number) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setClienteEditando(null);
      setResponsableEditando(null);
      await cargarClientes();
      if (refreshResponsables) {
        setResponsables(await cargarResponsables(refreshResponsables));
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCrearCliente(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCliente(true);
    setError(null);
    try {
      await createCliente(clienteForm);
      setClienteForm({
        ruc: "",
        razonSocial: "",
        tipoPersona: "JURIDICA",
        regulada: false,
      });
      await cargarClientes();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCreatingCliente(false);
    }
  }

  async function verResponsables(cliente: ClienteResponse) {
    setClienteSeleccionado(cliente);
    setError(null);
    try {
      setResponsables(await cargarResponsables(cliente.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  async function handleCrearResponsable(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteSeleccionado) return;
    setCreatingResponsable(true);
    setError(null);
    try {
      await createResponsable({
        clienteId: clienteSeleccionado.id,
        ...responsableForm,
      });
      setResponsableForm({ nombreCompleto: "", cargo: "" });
      setResponsables(await cargarResponsables(clienteSeleccionado.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setCreatingResponsable(false);
    }
  }

  function abrirEdicionCliente(c: ClienteResponse) {
    setClienteEditando(c);
    setClienteEditForm({
      razonSocial: c.razonSocial,
      tipoPersona: c.tipoPersona ?? "",
      estadoSunat: c.estadoSunat ?? "",
      sectorGiro: c.sectorGiro ?? "",
      representanteLegal: c.representanteLegal ?? "",
      telefonoContacto: c.telefonoContacto ?? "",
      regulada: c.regulada ?? false,
    });
  }

  function abrirEdicionResponsable(r: ResponsableResponse) {
    setResponsableEditando(r);
    setResponsableEditForm({
      dniRuc: r.dniRuc ?? "",
      nombreCompleto: r.nombreCompleto,
      telefono: r.telefono ?? "",
      email: r.email ?? "",
      cargo: r.cargo ?? "",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Clientes</h1>
      <ErrorBanner message={error} />

      <Card title="Clientes registrados">
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <Table
            columns={[
              { header: "RUC", render: (c: ClienteResponse) => c.ruc },
              {
                header: "Razón social",
                render: (c: ClienteResponse) => c.razonSocial,
              },
              {
                header: "Tipo",
                render: (c: ClienteResponse) => <Badge value={c.tipoPersona} />,
              },
              {
                header: "Estado",
                render: (c: ClienteResponse) => <Badge value={c.activo ?? true} />,
              },
              {
                header: "Acciones",
                render: (c: ClienteResponse) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => verResponsables(c)}>
                      Responsables
                    </Button>
                    <Button variant="ghost" onClick={() => abrirEdicionCliente(c)}>
                      Editar
                    </Button>
                    {c.activo === false ? (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() =>
                          run(
                            () => reactivateCliente(c.id),
                            clienteSeleccionado?.id === c.id ? c.id : undefined
                          )
                        }
                      >
                        Reactivar
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        loading={busy}
                        onClick={() =>
                          run(
                            // Desactivar un cliente desactiva en cascada (en el
                            // backend) a sus responsables activos -- si el panel
                            // de responsables de este cliente está abierto, hay
                            // que refrescarlo para que se note.
                            () => deactivateCliente(c.id),
                            clienteSeleccionado?.id === c.id ? c.id : undefined
                          )
                        }
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={clientes}
            keyFn={(c) => c.id}
          />
        )}
      </Card>

      <Card title="Nuevo cliente">
        <form onSubmit={handleCrearCliente} className="flex flex-col gap-3">
          <Field label="RUC">
            <input
              className={inputClass}
              value={clienteForm.ruc}
              onChange={(e) =>
                setClienteForm({ ...clienteForm, ruc: e.target.value })
              }
              required
            />
          </Field>
          <Field label="Razón social">
            <input
              className={inputClass}
              value={clienteForm.razonSocial}
              onChange={(e) =>
                setClienteForm({
                  ...clienteForm,
                  razonSocial: e.target.value,
                })
              }
              required
            />
          </Field>
          <Field label="Tipo de persona">
            <select
              className={inputClass}
              value={clienteForm.tipoPersona}
              onChange={(e) =>
                setClienteForm({
                  ...clienteForm,
                  tipoPersona: e.target.value,
                })
              }
            >
              <option value="JURIDICA">JURIDICA</option>
              <option value="NATURAL">NATURAL</option>
            </select>
          </Field>
          <Button type="submit" loading={creatingCliente}>
            Crear cliente
          </Button>
        </form>
      </Card>

      {clienteEditando && (
        <Card
          title={`Editar cliente: ${clienteEditando.razonSocial}`}
          action={
            <Button variant="ghost" onClick={() => setClienteEditando(null)}>
              Cerrar
            </Button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateCliente(clienteEditando.id, clienteEditForm));
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Razón social">
              <input
                className={inputClass}
                value={clienteEditForm.razonSocial}
                onChange={(e) =>
                  setClienteEditForm({ ...clienteEditForm, razonSocial: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Tipo de persona">
              <select
                className={inputClass}
                value={clienteEditForm.tipoPersona}
                onChange={(e) =>
                  setClienteEditForm({ ...clienteEditForm, tipoPersona: e.target.value })
                }
              >
                <option value="JURIDICA">JURIDICA</option>
                <option value="NATURAL">NATURAL</option>
              </select>
            </Field>
            <Field label="Estado SUNAT">
              <input
                className={inputClass}
                value={clienteEditForm.estadoSunat}
                onChange={(e) =>
                  setClienteEditForm({ ...clienteEditForm, estadoSunat: e.target.value })
                }
              />
            </Field>
            <Field label="Sector / giro">
              <input
                className={inputClass}
                value={clienteEditForm.sectorGiro}
                onChange={(e) =>
                  setClienteEditForm({ ...clienteEditForm, sectorGiro: e.target.value })
                }
              />
            </Field>
            <Field label="Representante legal">
              <input
                className={inputClass}
                value={clienteEditForm.representanteLegal}
                onChange={(e) =>
                  setClienteEditForm({
                    ...clienteEditForm,
                    representanteLegal: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Teléfono de contacto">
              <input
                className={inputClass}
                value={clienteEditForm.telefonoContacto}
                onChange={(e) =>
                  setClienteEditForm({
                    ...clienteEditForm,
                    telefonoContacto: e.target.value,
                  })
                }
              />
            </Field>
            <Button type="submit" loading={busy}>
              Guardar cambios
            </Button>
          </form>
        </Card>
      )}

      {clienteSeleccionado && (
        <Card
          title={`Responsables de ${clienteSeleccionado.razonSocial}`}
          action={
            <Button variant="ghost" onClick={() => setClienteSeleccionado(null)}>
              Cerrar
            </Button>
          }
        >
          <Table
            columns={[
              {
                header: "Nombre",
                render: (r: ResponsableResponse) => r.nombreCompleto,
              },
              { header: "Cargo", render: (r: ResponsableResponse) => r.cargo ?? "—" },
              {
                header: "Estado",
                render: (r: ResponsableResponse) => <Badge value={r.activo ?? true} />,
              },
              {
                header: "Acciones",
                render: (r: ResponsableResponse) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => abrirEdicionResponsable(r)}>
                      Editar
                    </Button>
                    {r.activo === false ? (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() =>
                          run(() => reactivateResponsable(r.id), clienteSeleccionado.id)
                        }
                      >
                        Reactivar
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        loading={busy}
                        onClick={() =>
                          run(() => deactivateResponsable(r.id), clienteSeleccionado.id)
                        }
                      >
                        Desactivar
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={responsables}
            keyFn={(r) => r.id}
            emptyLabel="Este cliente todavía no tiene responsables"
          />

          <form
            onSubmit={handleCrearResponsable}
            className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800"
          >
            <Field label="Nombre completo">
              <input
                className={inputClass}
                value={responsableForm.nombreCompleto}
                onChange={(e) =>
                  setResponsableForm({
                    ...responsableForm,
                    nombreCompleto: e.target.value,
                  })
                }
                required
              />
            </Field>
            <Field label="Cargo">
              <input
                className={inputClass}
                value={responsableForm.cargo}
                onChange={(e) =>
                  setResponsableForm({
                    ...responsableForm,
                    cargo: e.target.value,
                  })
                }
              />
            </Field>
            <Button type="submit" loading={creatingResponsable}>
              Agregar responsable
            </Button>
          </form>
        </Card>
      )}

      {responsableEditando && (
        <Card
          title={`Editar responsable: ${responsableEditando.nombreCompleto}`}
          action={
            <Button variant="ghost" onClick={() => setResponsableEditando(null)}>
              Cerrar
            </Button>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => updateResponsable(responsableEditando.id, responsableEditForm),
                clienteSeleccionado?.id
              );
            }}
            className="flex flex-col gap-3"
          >
            <Field label="DNI / RUC">
              <input
                className={inputClass}
                value={responsableEditForm.dniRuc}
                onChange={(e) =>
                  setResponsableEditForm({ ...responsableEditForm, dniRuc: e.target.value })
                }
              />
            </Field>
            <Field label="Nombre completo">
              <input
                className={inputClass}
                value={responsableEditForm.nombreCompleto}
                onChange={(e) =>
                  setResponsableEditForm({
                    ...responsableEditForm,
                    nombreCompleto: e.target.value,
                  })
                }
                required
              />
            </Field>
            <Field label="Teléfono">
              <input
                className={inputClass}
                value={responsableEditForm.telefono}
                onChange={(e) =>
                  setResponsableEditForm({
                    ...responsableEditForm,
                    telefono: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={responsableEditForm.email}
                onChange={(e) =>
                  setResponsableEditForm({ ...responsableEditForm, email: e.target.value })
                }
              />
            </Field>
            <Field label="Cargo">
              <input
                className={inputClass}
                value={responsableEditForm.cargo}
                onChange={(e) =>
                  setResponsableEditForm({ ...responsableEditForm, cargo: e.target.value })
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

// Funciones tipadas por recurso, todas sobre el transporte generico de api.ts.
// Mantiene las paginas libres de armar URLs/verbos a mano.

import { del, get, patch, post, put } from "./api";
import type {
  ActivoResponse,
  ActivoVehiculoResponse,
  ClaseActivoResponse,
  ClienteResponse,
  CobranzaContactoResponse,
  CobranzaResponse,
  ContratoDetalleResponse,
  ContratoResponse,
  EstadoFisico,
  HistorialEstadoCobranzaResponse,
  HistorialEstadoResponse,
  HistorialUbicacionResponse,
  HistorialLecturaVehiculoResponse,
  IncidenteActivoResponse,
  IngresoActivoResponse,
  LoginResponse,
  MovimientoResponse,
  ResponsableResponse,
  RolContacto,
  SeguroActivoResponse,
  Severidad,
  TipoPersona,
  TipoProductoResponse,
  UserResponse,
} from "./types";

// --- Auth ---

export function login(email: string, password: string) {
  return post<LoginResponse>("/api/auth/login", { email, password });
}

export function sessionPing() {
  return get<{ status: string }>("/api/session/ping");
}

// Cambio de la propia contraseña (pide la actual). Al confirmar, el back
// invalida cualquier otra sesión abierta con la contraseña vieja.
export function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  return post<{ message: string }>("/api/session/change-password", data);
}

// --- Clientes / Responsables ---

export function listClientes() {
  return get<ClienteResponse[]>("/api/clientes");
}

export function listClientesInactivos() {
  return get<ClienteResponse[]>("/api/clientes/inactivos");
}

export function createCliente(data: {
  ruc: string;
  razonSocial: string;
  tipoPersona?: TipoPersona;
  regulada?: boolean;
}) {
  return post<ClienteResponse>("/api/clientes", data);
}

export function listResponsablesByCliente(idCliente: number) {
  return get<ResponsableResponse[]>(`/api/clientes/${idCliente}/responsables`);
}

export function listResponsablesInactivos() {
  return get<ResponsableResponse[]>("/api/responsables/inactivos");
}

export function createResponsable(data: {
  clienteId: number;
  nombreCompleto: string;
  cargo?: string;
}) {
  return post<ResponsableResponse>("/api/responsables", data);
}

export function updateCliente(
  id: number,
  data: {
    razonSocial?: string;
    tipoPersona?: TipoPersona;
    estadoSunat?: string;
    sectorGiro?: string;
    representanteLegal?: string;
    telefonoContacto?: string;
    regulada?: boolean;
  }
) {
  return put<ClienteResponse>(`/api/clientes/${id}`, data);
}

export function deactivateCliente(id: number) {
  return del<void>(`/api/clientes/${id}`);
}

export function reactivateCliente(id: number) {
  return patch<ClienteResponse>(`/api/clientes/${id}/activate`);
}

export function updateResponsable(
  id: number,
  data: {
    dniRuc?: string;
    nombreCompleto?: string;
    telefono?: string;
    email?: string;
    cargo?: string;
  }
) {
  return put<ResponsableResponse>(`/api/responsables/${id}`, data);
}

export function deactivateResponsable(id: number) {
  return del<void>(`/api/responsables/${id}`);
}

export function reactivateResponsable(id: number) {
  return patch<ResponsableResponse>(`/api/responsables/${id}/activate`);
}

// --- Catalogo: clases de activo / tipos de producto ---

export function listClases() {
  return get<ClaseActivoResponse[]>("/api/clases-activos");
}

export function listClasesInactivas() {
  return get<ClaseActivoResponse[]>("/api/clases-activos/inactivos");
}

export function createClase(data: {
  nombre: string;
  descripcion?: string;
  esVehicular?: boolean;
}) {
  return post<ClaseActivoResponse>("/api/clases-activos", data);
}

export function updateClase(
  id: number,
  data: { nombre?: string; descripcion?: string; esVehicular?: boolean }
) {
  return put<ClaseActivoResponse>(`/api/clases-activos/${id}`, data);
}

export function deactivateClase(id: number) {
  return del<void>(`/api/clases-activos/${id}`);
}

export function reactivateClase(id: number) {
  return patch<void>(`/api/clases-activos/${id}/activate`);
}

export function listTipos() {
  return get<TipoProductoResponse[]>("/api/tipos-producto");
}

export function listTiposInactivos() {
  return get<TipoProductoResponse[]>("/api/tipos-producto/inactivos");
}

export function createTipoProducto(data: {
  claseId: number;
  nombre: string;
  descripcion?: string;
}) {
  return post<TipoProductoResponse>("/api/tipos-producto", data);
}

export function updateTipoProducto(
  id: number,
  data: { claseId?: number; nombre?: string; descripcion?: string }
) {
  return put<TipoProductoResponse>(`/api/tipos-producto/${id}`, data);
}

export function deactivateTipoProducto(id: number) {
  return del<void>(`/api/tipos-producto/${id}`);
}

export function reactivateTipoProducto(id: number) {
  return patch<void>(`/api/tipos-producto/${id}/activate`);
}

// --- Activos ---

export function listActivos() {
  return get<ActivoResponse[]>("/api/activos");
}

export function listActivosInactivos() {
  return get<ActivoResponse[]>("/api/activos/inactivos");
}

export function getActivo(id: number) {
  return get<ActivoResponse>(`/api/activos/${id}`);
}

// El "ingreso" es la puerta de entrada real de un activo al sistema: crea el
// activo Y el documento de ingreso (proveedor, costo, etc) en un solo paso.
export function registrarIngresoConActivoNuevo(data: {
  tipoIngreso?: string;
  ordenCompra?: string;
  proveedor?: string;
  numeroDocumento?: string;
  observacion?: string;
  items: Array<{
    codigoInterno: string;
    descripcion?: string;
    tipoProductoId: number;
    estadoOperativo?: string;
    costo?: number;
    moneda?: string;
    sede: string;
    area: string;
    detalle?: string;
  }>;
}) {
  return post<IngresoActivoResponse>(
    "/api/ingresos/con-activos-nuevos",
    data
  );
}

export function trasladarActivo(
  idActivo: number,
  data: { sede: string; area: string; detalle?: string; motivo?: string }
) {
  return patch<ActivoResponse>(`/api/activos/${idActivo}/trasladar`, data);
}

export function darDeBajaActivo(idActivo: number, data: { motivo: string }) {
  return patch<ActivoResponse>(`/api/activos/${idActivo}/dar-de-baja`, data);
}

export function updateActivo(
  id: number,
  data: {
    serie?: string;
    descripcion?: string;
    marca?: string;
    modelo?: string;
    anioFabricacion?: number;
    color?: string;
    especificaciones?: string;
    criticidad?: string;
    estadoFisico?: EstadoFisico;
    estadoOperativo?: string;
    vidaUtilAnios?: number;
    unidadesTotalesVida?: number;
    metodoDepreciacion?: string;
    valorResidual?: number;
    fechaFinGarantia?: string;
  }
) {
  return put<ActivoResponse>(`/api/activos/${id}`, data);
}

export function deactivateActivo(id: number) {
  return del<void>(`/api/activos/${id}`);
}

export function reactivateActivo(id: number) {
  return patch<ActivoResponse>(`/api/activos/${id}/activate`);
}

// Solo para activos con estadoOperativo="baja": reactiva + deja disponible +
// registra el movimiento de ingreso, todo en un paso. Para cualquier otro
// motivo de inactivación, seguir usando reactivateActivo().
export function reactivarReingresoActivo(
  id: number,
  data: { sede: string; area: string; detalle?: string; motivo?: string }
) {
  return patch<ActivoResponse>(`/api/activos/${id}/reactivar-reingreso`, data);
}

export function liberarMantenimientoActivo(
  id: number,
  data: { sede: string; area: string; detalle?: string }
) {
  return patch<ActivoResponse>(`/api/activos/${id}/liberar-mantenimiento`, data);
}

// Historial de tarifas: todos los detalles de contrato (de cualquier
// contrato) que tuvo ese activo a lo largo del tiempo.
export function getHistorialTarifasActivo(idActivo: number) {
  return get<ContratoDetalleResponse[]>(
    `/api/contratos/activo/${idActivo}/historial`
  );
}

// --- Seguros de activos ---

export function listSegurosByActivo(idActivo: number) {
  return get<SeguroActivoResponse[]>(`/api/seguros/activo/${idActivo}`);
}

// No hay endpoint filtrado por activo para inactivos; se trae la lista
// global de inactivos y se filtra client-side por idActivo.
export function listSegurosInactivos() {
  return get<SeguroActivoResponse[]>("/api/seguros/inactivos");
}

export function createSeguro(data: {
  idActivo: number;
  aseguradora?: string;
  numeroPoliza?: string;
  valorAsegurado?: number;
  primaAnual?: number;
  fechaInicio?: string;
  fechaVencimiento?: string;
}) {
  return post<SeguroActivoResponse>("/api/seguros", data);
}

export function updateSeguro(
  id: number,
  data: {
    aseguradora?: string;
    numeroPoliza?: string;
    valorAsegurado?: number;
    primaAnual?: number;
    fechaInicio?: string;
    fechaVencimiento?: string;
  }
) {
  return put<SeguroActivoResponse>(`/api/seguros/${id}`, data);
}

export function deactivateSeguro(id: number) {
  return del<void>(`/api/seguros/${id}`);
}

export function reactivateSeguro(id: number) {
  return patch<SeguroActivoResponse>(`/api/seguros/${id}/activate`);
}

// --- Ficha vehicular ---

export function getVehiculoByActivo(idActivo: number) {
  return get<ActivoVehiculoResponse>(`/api/activos-vehiculos/activo/${idActivo}`);
}

export function createVehiculo(data: {
  idActivo: number;
  placa?: string;
  kilometrajeInicial?: number;
  combustibleInicial?: number;
  capacidadTanque?: number;
}) {
  return post<ActivoVehiculoResponse>("/api/activos-vehiculos", data);
}

export function updateVehiculo(
  id: number,
  data: {
    placa?: string;
    kilometrajeInicial?: number;
    combustibleInicial?: number;
    capacidadTanque?: number;
  }
) {
  return put<ActivoVehiculoResponse>(`/api/activos-vehiculos/${id}`, data);
}

export function registrarLecturaVehiculo(
  id: number,
  data: { kilometraje?: number; combustible?: number; fechaRegistro?: string; observacion?: string }
) {
  return post<ActivoVehiculoResponse>(`/api/activos-vehiculos/${id}/lecturas`, data);
}

export function listLecturasVehiculo(id: number) {
  return get<HistorialLecturaVehiculoResponse[]>(
    `/api/activos-vehiculos/${id}/lecturas`
  );
}

// --- Movimientos (historial de un activo) ---

export function listMovimientosByActivo(idActivo: number) {
  return get<MovimientoResponse[]>(`/api/movimientos/activo/${idActivo}`);
}

export function listMovimientosByContrato(idContrato: number) {
  return get<MovimientoResponse[]>(`/api/movimientos/contrato/${idContrato}`);
}

export function getHistorialEstadosMovimiento(idMovimiento: number) {
  return get<HistorialEstadoResponse[]>(
    `/api/movimientos/${idMovimiento}/historial-estados`
  );
}

export function getHistorialUbicaciones(idActivo: number) {
  return get<HistorialUbicacionResponse[]>(
    `/api/movimientos/activo/${idActivo}/ubicaciones`
  );
}

export function cambiarEstadoMovimiento(
  idMovimiento: number,
  data: { nuevoEstado: string; observacion?: string }
) {
  return patch<MovimientoResponse>(
    `/api/movimientos/${idMovimiento}/estado`,
    data
  );
}

// --- Incidentes ---

export function listIncidentesByActivo(idActivo: number) {
  return get<IncidenteActivoResponse[]>(`/api/incidentes/activo/${idActivo}`);
}

export function reportarIncidente(data: {
  idActivo: number;
  tipoIncidente: string;
  severidad?: Severidad;
  descripcion?: string;
  observacion?: string;
}) {
  return post<IncidenteActivoResponse>("/api/incidentes", data);
}

export function derivarIncidenteAMantenimiento(
  idIncidente: number,
  data: { observacion?: string }
) {
  return patch<IncidenteActivoResponse>(
    `/api/incidentes/${idIncidente}/derivar-mantenimiento`,
    data
  );
}

export function derivarIncidenteABaja(
  idIncidente: number,
  data: { motivo: string }
) {
  return patch<IncidenteActivoResponse>(
    `/api/incidentes/${idIncidente}/derivar-baja`,
    data
  );
}

export function resolverIncidente(
  idIncidente: number,
  data: { observacion?: string; costoReparacion?: number }
) {
  return patch<IncidenteActivoResponse>(
    `/api/incidentes/${idIncidente}/resolver`,
    data
  );
}

// --- Mantenimiento (a nivel activo, para el caso "vuelve el mismo activo") ---

export function retornarMantenimiento(
  idActivo: number,
  data: { observacion?: string; sede: string; area: string; detalle?: string }
) {
  return post<unknown>(
    `/api/contratos/activo/${idActivo}/retornar-mantenimiento`,
    data
  );
}

// --- Contratos ---

export function listContratos() {
  return get<ContratoResponse[]>("/api/contratos");
}

export function listContratosInactivos() {
  return get<ContratoResponse[]>("/api/contratos/inactivos");
}

export function getContrato(id: number) {
  return get<ContratoResponse>(`/api/contratos/${id}`);
}

export function createContrato(data: {
  contratoCodigo: string;
  idCliente: number;
  fechaInicio: string;
  fechaFinPrevista?: string;
  detalles: Array<{
    idActivo: number;
    idResponsable?: number;
    tipoTarifa: "DIARIO" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
    precioBase: number;
    montoDescuento?: number;
    moneda: "PEN" | "USD";
    diaFacturacion?: number;
    fechaInicioAlquiler: string;
    fechaFinPrevista?: string;
  }>;
}) {
  return post<ContratoResponse>("/api/contratos", data);
}

export function updateContrato(
  id: number,
  data: {
    entidad?: string;
    tipoGrupo?: string;
    nombreGrupo?: string;
    ubicacion?: string;
    concepto?: string;
    estadoLegal?: string;
    legalContrato?: string;
    contactoCobranza?: string;
    logistica?: string;
  }
) {
  return put<ContratoResponse>(`/api/contratos/${id}`, data);
}

export function agregarDetalleContrato(
  idContrato: number,
  data: {
    idActivo: number;
    idResponsable?: number;
    tipoTarifa: "DIARIO" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
    precioBase: number;
    montoDescuento?: number;
    moneda: "PEN" | "USD";
    diaFacturacion?: number;
    fechaInicioAlquiler: string;
    fechaFinPrevista?: string;
  }
) {
  return post<ContratoResponse>(
    `/api/contratos/${idContrato}/detalles`,
    data
  );
}

// Version en lote: agrega varios activos al mismo contrato de una sola vez.
export function agregarDetallesLoteContrato(
  idContrato: number,
  data: {
    detalles: Array<{
      idActivo: number;
      idResponsable?: number;
      tipoTarifa: "DIARIO" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
      precioBase: number;
      montoDescuento?: number;
      moneda: "PEN" | "USD";
      diaFacturacion?: number;
      fechaInicioAlquiler: string;
      fechaFinPrevista?: string;
    }>;
  }
) {
  return post<ContratoResponse>(
    `/api/contratos/${idContrato}/detalles-lote`,
    data
  );
}

export function devolverActivo(
  idDetalle: number,
  data: { fechaFinReal?: string; observacion?: string }
) {
  return patch<unknown>(`/api/contratos/detalle/${idDetalle}/devolver`, data);
}

export function reemplazarActivo(
  idDetalle: number,
  data: {
    idActivoReemplazo: number;
    estadoActivoAnterior?: string;
    observacion?: string;
    fechaInicioAlquiler?: string;
    sede: string;
    area: string;
    detalle?: string;
  }
) {
  return post<unknown>(
    `/api/contratos/detalle/${idDetalle}/reemplazar`,
    data
  );
}

export function cambiarResponsable(
  idDetalle: number,
  data: { idResponsable: number; observacion?: string }
) {
  return patch<unknown>(
    `/api/contratos/detalle/${idDetalle}/cambiar-responsable`,
    data
  );
}

export function editarFechaInicioAlquiler(
  idDetalle: number,
  data: { nuevaFechaInicioAlquiler: string }
) {
  return patch<ContratoDetalleResponse>(
    `/api/contratos/detalle/${idDetalle}/fecha-inicio-alquiler`,
    data
  );
}

export function enviarAMantenimiento(idDetalle: number) {
  return patch<unknown>(
    `/api/contratos/detalle/${idDetalle}/enviar-a-mantenimiento`
  );
}

export function finalizarContrato(
  id: number,
  data?: { fechaFinReal?: string }
) {
  return patch<ContratoResponse>(`/api/contratos/${id}/finalizar`, data);
}

export function extenderContrato(
  id: number,
  data: { nuevaFechaFinPrevista: string }
) {
  return patch<ContratoResponse>(`/api/contratos/${id}/extender`, data);
}

// Confirma que un activo "pendiente_entrega" ya se le entregó físicamente al
// cliente (recién ahí se mueve su ubicación y se crea la asignación actual).
// Sede/área/detalle son siempre manuales, sin default sugerido.
export function confirmarEntregaContrato(
  idDetalle: number,
  data: { sede?: string; area?: string; detalle?: string }
) {
  return patch<ContratoDetalleResponse>(
    `/api/contratos/detalle/${idDetalle}/confirmar-entrega`,
    data
  );
}

// Simétrico: confirma que un activo "pendiente_recojo" ya volvió físicamente
// al almacén.
export function confirmarRecojoActivo(
  idActivo: number,
  data: { sede: string; area: string; detalle?: string }
) {
  return patch<void>(`/api/contratos/activo/${idActivo}/confirmar-recojo`, data);
}

// Version en lote: confirma TODOS los activos pendientes de ese contrato con
// la misma sede/area/detalle. Devuelve la cantidad confirmada.
export function confirmarEntregaLoteContrato(
  idContrato: number,
  data: { sede?: string; area?: string; detalle?: string }
) {
  return patch<number>(
    `/api/contratos/${idContrato}/confirmar-entrega-lote`,
    data
  );
}

export function confirmarRecojoLoteContrato(
  idContrato: number,
  data: { sede: string; area: string; detalle?: string }
) {
  return patch<number>(
    `/api/contratos/${idContrato}/confirmar-recojo-lote`,
    data
  );
}

// --- Cobranzas (por contrato) ---

export function listCobranzasByContrato(idContrato: number) {
  return get<CobranzaResponse[]>(`/api/cobranzas/contrato/${idContrato}`);
}

export function generarCobranza(data: {
  idContrato: number;
  periodo: string;
  porcentajeIgv?: number;
}) {
  return post<CobranzaResponse>("/api/cobranzas/generar", data);
}

export function emitirCobranza(idCobranza: number, data: { factura: string }) {
  return patch<CobranzaResponse>(`/api/cobranzas/${idCobranza}/emitir`, data);
}

export function cambiarEstadoCobranza(
  idCobranza: number,
  data: { nuevoEstado: string; observacion?: string }
) {
  return patch<CobranzaResponse>(`/api/cobranzas/${idCobranza}/estado`, data);
}

export function registrarPagoCobranza(
  idCobranza: number,
  data: { medioPago?: string; numeroOperacion?: string }
) {
  return patch<CobranzaResponse>(
    `/api/cobranzas/${idCobranza}/registrar-pago`,
    data
  );
}

export function getHistorialEstadosCobranza(idCobranza: number) {
  return get<HistorialEstadoCobranzaResponse[]>(
    `/api/cobranzas/${idCobranza}/historial-estados`
  );
}

export function listContactosCobranza(idCobranza: number) {
  return get<CobranzaContactoResponse[]>(
    `/api/cobranzas/${idCobranza}/contactos`
  );
}

export function agregarContactoCobranza(
  idCobranza: number,
  data: { nombre?: string; email: string; rol?: RolContacto }
) {
  return post<CobranzaContactoResponse>(
    `/api/cobranzas/${idCobranza}/contactos`,
    data
  );
}

export function desactivarContactoCobranza(idContacto: number) {
  return patch<void>(`/api/cobranzas/contactos/${idContacto}/desactivar`);
}

// Consulta directa "cuanto se debe de este periodo" -- ignora anuladas.
export function getCobranzaVigente(idContrato: number, periodo: string) {
  return get<CobranzaResponse>(
    `/api/cobranzas/contrato/${idContrato}/periodo/${periodo}/vigente`
  );
}

// --- Ingresos (documento de ingreso, como entidad propia) ---

export function listIngresos() {
  return get<IngresoActivoResponse[]>("/api/ingresos");
}

export function getIngreso(id: number) {
  return get<IngresoActivoResponse>(`/api/ingresos/${id}`);
}

export function updateIngreso(
  id: number,
  data: {
    tipoIngreso?: string;
    ordenCompra?: string;
    proveedor?: string;
    numeroDocumento?: string;
    fechaIngreso?: string;
    observacion?: string;
  }
) {
  return put<IngresoActivoResponse>(`/api/ingresos/${id}`, data);
}

export function agregarDetalleIngreso(
  id: number,
  data: {
    idActivo: number;
    costo?: number;
    moneda?: string;
    sede: string;
    area: string;
    detalle?: string;
  }
) {
  return post<IngresoActivoResponse>(`/api/ingresos/${id}/detalles`, data);
}

// Ingreso de un activo YA existente (a diferencia de con-activos-nuevos).
export function registrarIngresoConActivoExistente(data: {
  tipoIngreso?: string;
  ordenCompra?: string;
  proveedor?: string;
  numeroDocumento?: string;
  fechaIngreso?: string;
  observacion?: string;
  detalles: Array<{
    idActivo: number;
    costo?: number;
    moneda?: string;
    sede: string;
    area: string;
    detalle?: string;
  }>;
}) {
  return post<IngresoActivoResponse>("/api/ingresos", data);
}

// --- Usuarios (administracion) ---

export function listUsuarios() {
  return get<UserResponse[]>("/api/usuarios");
}

export function listUsuariosInactivos() {
  return get<UserResponse[]>("/api/usuarios/inactivos");
}

export function getUsuario(id: number) {
  return get<UserResponse>(`/api/usuarios/${id}`);
}

export function createUsuario(data: {
  rucDni?: string;
  nombreCompleto: string;
  emailCorporativo: string;
  password: string;
  roles: string[];
}) {
  return post<UserResponse>("/api/usuarios", data);
}

export function updateUsuario(
  id: number,
  data: { nombreCompleto?: string; emailCorporativo?: string; roles?: string[] }
) {
  return put<UserResponse>(`/api/usuarios/${id}`, data);
}

export function deactivateUsuario(id: number) {
  return del<void>(`/api/usuarios/${id}`);
}

export function reactivateUsuario(id: number) {
  return patch<void>(`/api/usuarios/${id}/activate`);
}

// El admin le pone una contraseña nueva a otro usuario (no pide la
// actual -- para eso este endpoint ya requiere rol ADMIN en el back).
export function resetPasswordUsuario(id: number, data: { newPassword: string }) {
  return patch<void>(`/api/usuarios/${id}/reset-password`, data);
}

// --- Repotenciacion ---

// Swap: el activo actual sale y entra OTRO activo fisico ya repotenciado.
export function repotenciarSwap(
  idDetalle: number,
  data: {
    idActivoNuevo: number;
    nuevoPrecioBase: number;
    tipoTarifa: "DIARIO" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
    moneda: "PEN" | "USD";
    fechaInicioAlquiler: string;
    sede: string;
    area: string;
    detalle?: string;
  }
) {
  return post<unknown>(`/api/contratos/detalle/${idDetalle}/repotenciar`, data);
}

// Mismo activo: se manda a mantenimiento (enviarAMantenimiento) y, cuando
// vuelve repotenciado, se completa con este request (precio nuevo).
export function repotenciarCompletar(
  idActivo: number,
  data: {
    tipoTarifa: "DIARIO" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
    precioBase: number;
    moneda: "PEN" | "USD";
    fechaInicioAlquiler?: string;
    sede: string;
    area: string;
    detalle?: string;
  }
) {
  return post<unknown>(
    `/api/contratos/activo/${idActivo}/repotenciar-completar`,
    data
  );
}

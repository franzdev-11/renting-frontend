// Formas minimas de las respuestas del backend que usa el dashboard.
// No son DTOs completos -- solo los campos que la UI realmente muestra.

export interface LoginResponse {
  username: string;
  message: string;
  roles: string[];
}

export interface ClaseActivoResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  esVehicular?: boolean;
  activo?: boolean;
}

export interface TipoProductoResponse {
  id: number;
  claseId: number;
  claseNombre?: string;
  esVehicular?: boolean;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export type TipoPersona = "JURIDICA" | "NATURAL";

export interface ClienteResponse {
  id: number;
  ruc: string;
  razonSocial: string;
  tipoPersona?: TipoPersona;
  estadoSunat?: string;
  sectorGiro?: string;
  representanteLegal?: string;
  telefonoContacto?: string;
  regulada?: boolean;
  activo?: boolean;
}

export interface ResponsableResponse {
  id: number;
  clienteId: number;
  clienteRazonSocial?: string;
  dniRuc?: string;
  nombreCompleto: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  activo?: boolean;
}

export type EstadoFisico = "NUEVO" | "SELLADO" | "USADO" | "REPARADO" | "OBSOLETO";

export interface ActivoResponse {
  idActivo: number;
  codigoInterno: string;
  serie?: string;
  descripcion?: string;
  claseId?: number;
  claseNombre?: string;
  esVehicular?: boolean;
  tipoProductoId: number;
  tipoProductoNombre?: string;
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
  activo?: boolean;
}

export interface DetalleIngresoActivoResponse {
  idDetalleIngreso: number;
  idActivo: number;
  codigoInternoActivo: string;
  costo?: number;
  moneda?: string;
}

export interface IngresoActivoResponse {
  idIngreso: number;
  tipoIngreso?: string;
  ordenCompra?: string;
  proveedor?: string;
  numeroDocumento?: string;
  fechaIngreso?: string;
  observacion?: string;
  registradoPorId?: number;
  registradoPorNombre?: string;
  createdAt?: string;
  detalles: DetalleIngresoActivoResponse[];
}

export type TipoMovimiento =
  | "INGRESO"
  | "ENTREGA"
  | "DEVOLUCION"
  | "REEMPLAZO"
  | "MANTENIMIENTO"
  | "RETORNO_MANTENIMIENTO"
  | "CAMBIO_RESPONSABLE"
  | "CAMBIO_UBICACION"
  | "BAJA"
  | "REPOTENCIACION";

export interface MovimientoResponse {
  idMovimiento: number;
  idContrato?: number;
  idDetalleContrato?: number;
  idActivo: number;
  codigoInternoActivo?: string;
  idActivoReemplazo?: number;
  codigoInternoActivoReemplazo?: string;
  idResponsable?: number;
  nombreResponsable?: string;
  tipoMov: TipoMovimiento;
  motivo?: string;
  estadoActual?: string;
  observacion?: string;
  esUltimo?: boolean;
  fechaMovimiento: string;
  idUsuarioRegistro?: number;
  nombreUsuarioRegistro?: string;
}

export interface HistorialEstadoResponse {
  idHistorial: number;
  idMovimiento: number;
  estadoAnterior?: string;
  estadoNuevo: string;
  fechaCambio: string;
  idUsuario?: number;
  nombreUsuario?: string;
  observacion?: string;
}

export interface HistorialUbicacionResponse {
  idHistorial: number;
  sede?: string;
  area?: string;
  detalle?: string;
  fechaDesde: string;
  fechaHasta?: string;
  idMovimiento?: number;
  idUsuarioRegistro?: number;
  nombreUsuarioRegistro?: string;
}

export type Severidad = "LEVE" | "MODERADO" | "GRAVE";
export type EstadoIncidente = "REPORTADO" | "DERIVADO_MANTENIMIENTO" | "DADO_DE_BAJA" | "RESUELTO";

export interface IncidenteActivoResponse {
  idIncidente: number;
  idActivo: number;
  codigoInternoActivo?: string;
  idMovimiento?: number;
  tipoIncidente: string;
  severidad?: Severidad;
  descripcion?: string;
  fechaIncidente?: string;
  costoReparacion?: number;
  estadoIncidente: EstadoIncidente;
  proveedorReparacion?: string;
  fechaReparacion?: string;
  observacion?: string;
  idUsuarioRegistro?: number;
  nombreUsuarioRegistro?: string;
  createdAt?: string;
}

export interface ContratoDetalleResponse {
  idDetalle: number;
  idActivo: number;
  codigoInternoActivo: string;
  idResponsable?: number;
  nombreResponsable?: string;
  tipoTarifa: "DIARIO" | "SEMANAL" | "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
  precioBase: number;
  montoDescuento?: number;
  precioFinal: number;
  moneda: "PEN" | "USD";
  diaFacturacion?: number;
  fechaInicioAlquiler: string;
  fechaFinPrevista?: string;
  fechaFinReal?: string;
  activo: boolean;
}

export interface ContratoResponse {
  idContrato: number;
  contratoCodigo: string;
  idCliente: number;
  clienteRazonSocial?: string;
  entidad?: string;
  tipoGrupo?: string;
  nombreGrupo?: string;
  ubicacion?: string;
  concepto?: string;
  estadoLegal?: string;
  legalContrato?: string;
  contactoCobranza?: string;
  logistica?: string;
  fechaInicio: string;
  fechaFinPrevista?: string;
  fechaFinReal?: string;
  vigente: boolean;
  createdByNombre?: string;
  createdAt?: string;
  detalles: ContratoDetalleResponse[];
}

export interface CobranzaDetalleResponse {
  idCobranzasDetalle: number;
  idDetalleContrato: number;
  idActivo: number;
  codigoInternoActivo: string;
  descripcion?: string;
  diasFacturados: number;
  precioBase: number;
  descuento?: number;
  precioFinal: number;
  subtotal: number;
}

export interface CobranzaResponse {
  idCobranza: number;
  idContrato: number;
  contratoCodigo?: string;
  periodo: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  moneda?: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  factura?: string;
  detalles: CobranzaDetalleResponse[];
}

export type RolContacto = "TO" | "CC" | "BCC";

export interface CobranzaContactoResponse {
  idContacto: number;
  idCobranza: number;
  nombre?: string;
  email: string;
  rol?: RolContacto;
  activo?: boolean;
}

export interface HistorialEstadoCobranzaResponse {
  idHistorial: number;
  idCobranza: number;
  estadoAnterior?: string;
  estadoNuevo: string;
  fechaCambio: string;
  idUsuario?: number;
  nombreUsuario?: string;
  observacion?: string;
}

export interface SeguroActivoResponse {
  idSeguro: number;
  idActivo: number;
  codigoInternoActivo?: string;
  aseguradora?: string;
  numeroPoliza?: string;
  valorAsegurado?: number;
  primaAnual?: number;
  fechaInicio?: string;
  fechaVencimiento?: string;
  activo: boolean;
}

export interface ActivoVehiculoResponse {
  idVehiculo: number;
  idActivo: number;
  codigoInternoActivo?: string;
  placa?: string;
  kilometrajeInicial?: number;
  combustibleInicial?: number;
  capacidadTanque?: number;
  kilometrajeActual?: number;
  combustibleActual?: number;
  fechaUltimaLectura?: string;
}

export interface HistorialLecturaVehiculoResponse {
  idLectura: number;
  kilometraje?: number;
  combustible?: number;
  fechaRegistro: string;
  observacion?: string;
}

export interface UserResponse {
  id: number;
  rucDni?: string;
  nombreCompleto: string;
  emailCorporativo: string;
  activo?: boolean;
  roles?: string[];
}

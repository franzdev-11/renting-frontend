// Cliente HTTP minimo para el backend de renting.
//
// El login NO devuelve un JWT en el body -- el backend lo manda como cookie
// httpOnly (SameSite=Strict). Por eso cada fetch va con credentials:"include":
// el navegador adjunta la cookie solo si se lo pedimos explicitamente, aunque
// front (localhost:3000) y backend (localhost:8080) sean "same site" (mismo
// dominio "localhost", distinto puerto).
//
// Para que esto funcione, el backend tiene que arrancar con la variable de
// entorno CORS_ALLOWED_ORIGINS incluyendo el origen exacto del front
// (ej: CORS_ALLOWED_ORIGINS=http://localhost:3000), si no el navegador
// bloquea la respuesta por CORS antes de que la app la vea.

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// El backend responde los errores de 2 formas distintas segun el caso
// (ver GlobalExceptionHandler):
//   - texto plano: 404 / 400 (IllegalState) / 409 (IllegalArgument o
//     violacion de constraint)
//   - un mapa { campo: mensaje }: 400 de validaciones @Valid
// Este helper normaliza ambos casos a un solo string legible.
function extraerMensajeError(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const valores = Object.values(body as Record<string, unknown>);
    if (valores.length > 0) return valores.join(" | ");
  }
  return "Error desconocido";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Varios endpoints de listado (tipos-producto, clases-activo, usuarios)
  // devuelven 204 sin body cuando la lista está vacía, en vez de 200 con [].
  // Sin este caso especial, el body quedaba en "" y cualquier `.map()` en
  // el front explotaba ("tipos.map is not a function") apenas la tabla
  // estaba vacía -- justo el escenario de una base de datos recién creada.
  if (res.status === 204) {
    return [] as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    // Sesión inválida (token vencido, revocado por un logout, o el usuario
    // fue desactivado) -- sacamos ya, sin esperar a que la persona navegue
    // a otra página para que AppShell recién ahí se dé cuenta con el ping.
    // Se excluye /api/auth/** porque un 401 ahí es "contraseña incorrecta"
    // en el propio formulario de login, no una sesión que haya que cortar.
    if (
      res.status === 401 &&
      !path.startsWith("/api/auth/") &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    throw new ApiError(res.status, extraerMensajeError(body), body);
  }

  return body as T;
}

export function get<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

export function post<T>(path: string, data?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function patch<T>(path: string, data?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function put<T>(path: string, data?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PUT",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

export function del<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}

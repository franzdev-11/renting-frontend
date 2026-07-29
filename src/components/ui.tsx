"use client";

// Piezas de UI compartidas por todo el dashboard: inputs, botones, tarjetas,
// tablas genericas y badges de estado. Nada de esto habla con el backend,
// solo presentacion.

export const inputClass =
  "w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export function Card({
  title,
  description,
  action,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
      {(title || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-medium">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300",
  secondary:
    "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800",
  danger:
    "border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950",
  ghost: "text-neutral-600 hover:underline dark:text-neutral-400",
};

export function Button({
  children,
  onClick,
  loading,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`w-fit rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${buttonVariants[variant]}`}
    >
      {loading ? "Enviando..." : children}
    </button>
  );
}

const badgeColors: Record<string, string> = {
  disponible: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  alquilado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  mantenimiento:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  baja: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  reportado: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  resuelto: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  pendiente: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  pendiente_entrega:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  pendiente_recojo:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  facturado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  enviado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  pagado: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  vencido: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  anulado: "bg-neutral-200 text-neutral-500 line-through dark:bg-neutral-800",
  actual: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

export function Badge({ value }: { value?: string | boolean | null }) {
  if (value === undefined || value === null || value === "")
    return <span className="text-neutral-400">—</span>;
  const text = typeof value === "boolean" ? (value ? "sí" : "no") : value;
  const color =
    badgeColors[text.toLowerCase()] ??
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {text}
    </span>
  );
}

export function Table<T>({
  columns,
  rows,
  keyFn,
  emptyLabel = "Sin datos todavía",
  rowClassName,
}: {
  columns: { header: string; render: (row: T) => React.ReactNode }[];
  rows: T[];
  keyFn: (row: T) => string | number;
  emptyLabel?: string;
  rowClassName?: (row: T, index: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
            {columns.map((c) => (
              <th key={c.header} className="whitespace-nowrap px-3 py-2 font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={keyFn(row)}
              className={`border-b border-neutral-100 last:border-0 dark:border-neutral-900 ${rowClassName ? rowClassName(row, index) : ""}`}
            >
              {columns.map((c) => (
                <td key={c.header} className="whitespace-nowrap px-3 py-2">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// tipo_ingreso sigue siendo texto libre en el backend (el DDL dice "etc" --
// lista abierta, no es un enum real) -- este select es solo una ayuda de UX
// para no tener que escribir a mano los valores más comunes. "otro" revela
// un input de texto libre al lado para cualquier valor que no esté en la
// lista. Los valores se mantienen en minúscula (así ya está guardado hoy).
const TIPOS_INGRESO_CONOCIDOS = [
  "compra",
  "donacion",
  "transferencia",
  "garantia",
  "leasing",
] as const;

export function TipoIngresoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const esConocido = (TIPOS_INGRESO_CONOCIDOS as readonly string[]).includes(value);

  return (
    <Field label="Tipo de ingreso">
      <div className="flex flex-col gap-2">
        <select
          className={inputClass}
          value={esConocido ? value : "otro"}
          onChange={(e) => {
            if (e.target.value === "otro") {
              onChange("");
            } else {
              onChange(e.target.value);
            }
          }}
        >
          {TIPOS_INGRESO_CONOCIDOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="otro">otro...</option>
        </select>
        {!esConocido && (
          <input
            className={inputClass}
            placeholder="Escribí el tipo de ingreso"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </Field>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      {message}
    </div>
  );
}

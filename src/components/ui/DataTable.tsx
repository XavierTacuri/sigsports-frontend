import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getKey: (item: T) => string | number;
  emptyMessage?: string;
  renderActions?: (item: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  getKey,
  emptyMessage = 'No hay datos registrados.',
  renderActions,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[850px] divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {column.header}
              </th>
            ))}
            {renderActions ? (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Acciones
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item, rowIndex) => (
            <tr key={getKey(item)} className="hover:bg-slate-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-sm text-slate-700"
                >
                  {column.render(item, rowIndex)}
                </td>
              ))}
              {renderActions ? (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {renderActions(item)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

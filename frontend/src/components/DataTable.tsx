import React from 'react';

export interface Column<T> {
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, emptyMessage = 'Nothing recorded yet.' }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant px-6 py-10 text-center type-body-medium text-on-surface-variant">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-container-low">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`whitespace-nowrap px-4 py-3 type-label-large text-on-surface-variant ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-outline-variant transition-colors last:border-b-0 hover:bg-on-surface/[0.04]"
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`px-4 py-3 align-middle type-body-medium text-on-surface ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.render(item, rowIdx)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

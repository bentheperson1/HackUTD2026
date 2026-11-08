import React from 'react';

export interface Column<T> {
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  /** Optional Tailwind width / alignment classes for this column */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  /** Render inside a Card (no outer border) */
  bare?: boolean;
  rowKey?: (item: T, index: number) => string;
}

export function DataTable<T>({ columns, data, emptyMessage = 'Nothing here yet.', bare, rowKey }: DataTableProps<T>) {
  const frame = bare ? '' : 'border-y border-line-strong';

  if (data.length === 0) {
    return <div className={`${frame} py-8 text-[13px] text-fg-subtle`}>{emptyMessage}</div>;
  }

  return (
    <div className={`${frame} overflow-x-auto`}>
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`h-9 px-3 text-[11px] font-semibold tracking-[0.09em] whitespace-nowrap text-fg-subtle uppercase first:pl-0 last:pr-0 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr
              key={rowKey ? rowKey(item, rowIdx) : rowIdx}
              className="border-b border-line transition-colors last:border-b-0 hover:bg-surface/60"
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-3 py-3 align-middle text-fg first:pl-0 last:pr-0 ${col.className ?? ''}`}>
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

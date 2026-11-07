import React from 'react';

export interface Column<T> {
  header: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, emptyMessage = 'No records logged yet.' }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-6 text-center rounded-xl border border-[#232936] bg-[#12161F] text-slate-400 text-xs italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#262C38] bg-[#12161F] shadow-lg">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#181E2A] border-b border-[#262C38]">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 border-r border-[#262C38] last:border-r-0"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E2431]">
          {data.map((item, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-[#171D28] transition-colors">
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className="px-4 py-3 text-xs text-slate-200 border-r border-[#1E2431] last:border-r-0 align-top"
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

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

export function DataTable<T>({ columns, data, emptyMessage = 'No data recorded yet.' }: DataTableProps<T>) {
  if (data.length === 0) {
    return <p style={{ fontStyle: 'italic' }}>{emptyMessage}</p>;
  }

  return (
    <table border={1} cellPadding={6} cellSpacing={0} style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f0f0f0', textAlign: 'left' }}>
          {columns.map((col, idx) => (
            <th key={idx}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, rowIdx) => (
          <tr key={rowIdx}>
            {columns.map((col, colIdx) => (
              <td key={colIdx}>{col.render(item, rowIdx)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}


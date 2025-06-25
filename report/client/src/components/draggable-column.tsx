import { useDrag } from 'react-dnd';
import { Key, Mail, Calendar, ToggleLeft, Hash, Type } from 'lucide-react';
import type { Column } from '@/types/query';

interface DraggableColumnProps {
  column: Column;
  tableName: string;
}

const getColumnIcon = (column: Column) => {
  if (column.primaryKey) return <Key className="w-3 h-3 text-yellow-600" />;
  
  switch (column.type.toLowerCase()) {
    case 'varchar':
    case 'text':
    case 'char':
      return <Type className="w-3 h-3 text-gray-400" />;
    case 'timestamp':
    case 'date':
    case 'time':
      return <Calendar className="w-3 h-3 text-gray-400" />;
    case 'integer':
    case 'bigint':
    case 'numeric':
    case 'decimal':
      return <Hash className="w-3 h-3 text-gray-400" />;
    case 'boolean':
      return <ToggleLeft className="w-3 h-3 text-green-500" />;
    default:
      return <Type className="w-3 h-3 text-gray-400" />;
  }
};

export function DraggableColumn({ column, tableName }: DraggableColumnProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'column',
    item: { type: 'column', tableName, column },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`flex items-center justify-between p-2 bg-white rounded border border-gray-100 hover:border-primary cursor-move transition-all ${
        isDragging ? 'opacity-50' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-center space-x-2">
        <div className="text-gray-300">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <div className="flex items-center space-x-2">
          {getColumnIcon(column)}
          <span className="text-sm font-medium text-gray-700">{column.name}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
        {column.type}
      </span>
    </div>
  );
}

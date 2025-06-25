import { useDrop } from 'react-dnd';
import { ReactNode } from 'react';

interface DroppableZoneProps {
  onDrop: (item: any) => void;
  acceptedTypes: string[];
  children: ReactNode;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

export function DroppableZone({ 
  onDrop, 
  acceptedTypes, 
  children, 
  className = '', 
  emptyMessage,
  emptyIcon 
}: DroppableZoneProps) {
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: acceptedTypes,
    drop: (item) => {
      console.log('DroppableZone drop:', item);
      onDrop(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = canDrop && isOver;

  return (
    <div
      ref={drop}
      className={`
        min-h-24 p-4 rounded-lg border-2 border-dashed transition-all
        ${isActive 
          ? 'border-primary bg-blue-50' 
          : canDrop 
            ? 'border-blue-300 bg-blue-25' 
            : 'border-gray-200 bg-white'
        }
        ${className}
      `}
    >
      {children}
      {emptyMessage && !children && (
        <div className="text-center text-gray-500 py-4">
          {emptyIcon && (
            <div className="mb-2 flex justify-center opacity-50">
              {emptyIcon}
            </div>
          )}
          <p className="text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { moveColumn, toggleColumnVisibility, type ColumnPreference } from '@/lib/table/columns';

interface TableOptionsModalProps {
  title: string;
  columns: ColumnPreference[];
  onChange: (columns: ColumnPreference[]) => void;
  onClose: () => void;
}

interface SortableItemProps {
  id: string;
  column: ColumnPreference;
  index: number;
  total: number;
  columns: ColumnPreference[];
  onChange: (columns: ColumnPreference[]) => void;
}

function SortableItem({ id, column, index, total, columns, onChange }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle p-2"
      {...attributes}
      {...listeners}
    >
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          aria-label={`Toggle ${column.label}`}
          checked={column.visible}
          onChange={() => onChange(toggleColumnVisibility(columns, column.key))}
          onClick={(e) => e.stopPropagation()}
        />
        <span>{column.label}</span>
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Move ${column.label} up`}
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onChange(moveColumn(columns, index, Math.max(0, index - 1)));
          }}
          disabled={index <= 0}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Move ${column.label} down`}
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onChange(moveColumn(columns, index, Math.min(total - 1, index + 1)));
          }}
          disabled={index >= total - 1}
        >
          ↓
        </button>
      </div>
    </li>
  );
}

function DragOverlayItem({ column }: { column: ColumnPreference }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle bg-surface-2 p-2 shadow-lg">
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={column.visible}
          disabled
        />
        <span>{column.label}</span>
      </label>
    </div>
  );
}

export function TableOptionsModal({ title, columns, onChange, onClose }: TableOptionsModalProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = columns.findIndex((col) => col.key === active.id);
      const newIndex = columns.findIndex((col) => col.key === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(columns, oldIndex, newIndex));
      }
    },
    [columns, onChange],
  );

  const activeColumn = activeId ? columns.find((col) => col.key === activeId) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-3/70 px-4">
      <div className="w-full max-w-md rounded-md border border-border-subtle bg-surface-1 p-4 shadow-elevation-3">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columns.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {columns.map((column, index) => (
                <SortableItem
                  key={column.key}
                  id={column.key}
                  column={column}
                  index={index}
                  total={columns.length}
                  columns={columns}
                  onChange={onChange}
                />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay>
            {activeColumn ? <DragOverlayItem column={activeColumn} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
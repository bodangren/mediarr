'use client';

import { useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { moveColumn, toggleColumnVisibility, type ColumnPreference } from '@/lib/table/columns';

interface TableOptionsModalProps {
  title: string;
  columns: ColumnPreference[];
  onChange: (columns: ColumnPreference[]) => void;
  onClose: () => void;
}

const COLUMN_ITEM_TYPE = 'table-column';

interface DragItem {
  index: number;
}

interface ColumnRowProps {
  column: ColumnPreference;
  index: number;
  total: number;
  columns: ColumnPreference[];
  onChange: (columns: ColumnPreference[]) => void;
}

export function reorderOnHover(columns: ColumnPreference[], dragIndex: number, hoverIndex: number): ColumnPreference[] {
  if (dragIndex === hoverIndex) {
    return columns;
  }

  return moveColumn(columns, dragIndex, hoverIndex);
}

export function applyHoverReorder(
  columns: ColumnPreference[],
  item: DragItem,
  hoverIndex: number,
  onChange: (columns: ColumnPreference[]) => void,
) {
  const next = reorderOnHover(columns, item.index, hoverIndex);
  if (next === columns) {
    return;
  }

  onChange(next);
  item.index = hoverIndex;
}

function ColumnRow({ column, index, total, columns, onChange }: ColumnRowProps) {
  const ref = useRef<HTMLLIElement>(null);

  const [, drop] = useDrop<DragItem>({
    accept: COLUMN_ITEM_TYPE,
    hover(item) {
      applyHoverReorder(columns, item, index, onChange);
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: COLUMN_ITEM_TYPE,
    item: { index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const attachRowRef = useCallback(
    (node: HTMLLIElement | null) => {
      ref.current = node;
      drag(drop(node));
    },
    [drag, drop],
  );

  return (
    <li
      ref={attachRowRef}
      className="flex items-center justify-between gap-2 rounded-sm border border-border-subtle p-2"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          aria-label={`Toggle ${column.label}`}
          checked={column.visible}
          onChange={() => onChange(toggleColumnVisibility(columns, column.key))}
        />
        <span>{column.label}</span>
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Move ${column.label} up`}
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
          onClick={() => onChange(moveColumn(columns, index, Math.max(0, index - 1)))}
          disabled={index <= 0}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`Move ${column.label} down`}
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
          onClick={() => onChange(moveColumn(columns, index, Math.min(total - 1, index + 1)))}
          disabled={index >= total - 1}
        >
          ↓
        </button>
      </div>
    </li>
  );
}

export function TableOptionsModal({ title, columns, onChange, onClose }: TableOptionsModalProps) {
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

        <DndProvider backend={HTML5Backend}>
          <ul className="space-y-2">
            {columns.map((column, index) => (
              <ColumnRow
                key={column.key}
                column={column}
                index={index}
                total={columns.length}
                columns={columns}
                onChange={onChange}
              />
            ))}
          </ul>
        </DndProvider>
      </div>
    </div>
  );
}

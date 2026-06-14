import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: danger ? '#FEF2F2' : '#F5F3FF' }}
          >
            {danger
              ? <Trash2 size={18} style={{ color: '#EF4444' }} />
              : <AlertTriangle size={18} style={{ color: '#7C3AED' }} />}
          </div>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }} className="mb-1">{title}</p>
          <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 transition-colors hover:bg-gray-50"
            style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl transition-colors"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              background: danger ? '#EF4444' : '#7C3AED',
              color: 'white',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

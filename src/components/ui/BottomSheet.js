'use client';

import { useEffect } from 'react';

export default function BottomSheet({ open, onClose, title, children, height = '50vh' }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl transition-transform duration-200 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={height === 'auto' ? { maxHeight: '80vh' } : { height }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div className="px-4 pb-2 border-b border-gray-100">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}

        <div
          className="overflow-y-auto px-4 py-3"
          style={height === 'auto' ? { maxHeight: 'calc(80vh - 3rem)' } : { maxHeight: `calc(${height} - 3rem)` }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

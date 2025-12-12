import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, actions, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newTop = y;
      let newLeft = x;

      if (x + rect.width > window.innerWidth) {
        newLeft = x - rect.width;
      }
      if (y + rect.height > window.innerHeight) {
        newTop = y - rect.height;
      }
      
      menuRef.current.style.top = `${newTop}px`;
      menuRef.current.style.left = `${newLeft}px`;
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      data-context-menu="true"
      className="fixed z-50 min-w-40 bg-bg-secondary border border-border-normal rounded-lg shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          disabled={action.disabled}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors
            ${action.disabled ? 'opacity-50 cursor-not-allowed text-text-muted' : 
              action.danger 
                ? 'text-accent-danger hover:bg-accent-danger/10' 
                : 'text-text-primary hover:bg-accent-primary/10 hover:text-accent-primary'
            }
          `}
          onClick={() => {
            if (!action.disabled) {
              action.onClick();
              onClose();
            }
          }}
        >
          {action.icon && <span className="w-4 h-4">{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>,
    document.body
  );
};

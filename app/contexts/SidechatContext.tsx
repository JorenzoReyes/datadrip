'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SidechatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SidechatContext = createContext<SidechatContextType | undefined>(undefined);

export function SidechatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SidechatContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidechatContext.Provider>
  );
}

export function useSidechat() {
  const context = useContext(SidechatContext);
  if (context === undefined) {
    throw new Error('useSidechat must be used within a SidechatProvider');
  }
  return context;
}

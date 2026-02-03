import { AddItemModal } from '@/components/add-item-modal';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

type AddItemModalContextValue = {
  openAddItemModal: () => void;
};

const AddItemModalContext = createContext<AddItemModalContextValue | null>(null);

export function useAddItemModal() {
  const ctx = useContext(AddItemModalContext);
  if (!ctx) throw new Error('useAddItemModal must be used within AddItemModalProvider');
  return ctx;
}

export function AddItemModalProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);

  const openAddItemModal = useCallback(() => {
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => setVisible(false), []);
  const handleSuccess = useCallback(() => setVisible(false), []);

  return (
    <AddItemModalContext.Provider value={{ openAddItemModal }}>
      {children}
      <AddItemModal visible={visible} onClose={handleClose} onSuccess={handleSuccess} />
    </AddItemModalContext.Provider>
  );
}

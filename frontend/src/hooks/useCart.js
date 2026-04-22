import { useContext } from 'react';

import { CartContext } from '../context/CartContext';

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart phải được sử dụng trong CartProvider');
  }

  return context;
};

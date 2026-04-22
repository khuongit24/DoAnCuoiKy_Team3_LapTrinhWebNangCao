/* eslint-disable react-refresh/only-export-components */

import { createContext, useEffect, useMemo, useState } from 'react';

import { CART_ITEMS_KEY } from '../utils/storageKeys';

export const CartContext = createContext(null);

const readStoredCartItems = () => {
  const rawData = localStorage.getItem(CART_ITEMS_KEY);

  if (!rawData) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getProductId = (item) => item?._id || item?.id;

const getSafeStockLimit = (...values) => {
  for (const value of values) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      return Math.max(1, Math.floor(parsedValue));
    }
  }

  return Number.MAX_SAFE_INTEGER;
};

const toSafeQuantity = (qty, countInStock = Number.MAX_SAFE_INTEGER) => {
  const normalizedQty = Number(qty);
  const maxQty = getSafeStockLimit(countInStock);

  if (!Number.isFinite(normalizedQty) || normalizedQty <= 1) {
    return 1;
  }

  return Math.min(Math.floor(normalizedQty), maxQty);
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => readStoredCartItems());

  useEffect(() => {
    localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, qty = 1) => {
    const productId = getProductId(product);

    if (!productId) {
      return;
    }

    setCartItems((previousItems) => {
      const existingItem = previousItems.find((item) => getProductId(item) === productId);
      const stockLimit = getSafeStockLimit(product?.countInStock, existingItem?.countInStock);

      if (!existingItem && Number(product?.countInStock) <= 0) {
        return previousItems;
      }

      if (existingItem) {
        const updatedQuantity = toSafeQuantity(existingItem.qty + qty, stockLimit);

        return previousItems.map((item) => {
          if (getProductId(item) !== productId) {
            return item;
          }

          return {
            ...item,
            qty: updatedQuantity,
          };
        });
      }

      return [
        ...previousItems,
        {
          ...product,
          _id: productId,
          qty: toSafeQuantity(qty, stockLimit),
        },
      ];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems((previousItems) => previousItems.filter((item) => getProductId(item) !== productId));
  };

  const updateQty = (productId, qty) => {
    setCartItems((previousItems) =>
      previousItems.map((item) => {
        if (getProductId(item) !== productId) {
          return item;
        }

        return {
          ...item,
          qty: toSafeQuantity(qty, item.countInStock),
        };
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const itemsCount = useMemo(
    () => cartItems.reduce((total, item) => total + Number(item.qty || 0), 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () =>
      cartItems.reduce((total, item) => {
        const price = Number(item.salePrice || item.price || 0);
        const qty = Number(item.qty || 0);
        return total + price * qty;
      }, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      itemsCount,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
    }),
    [cartItems, itemsCount, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores
 * @param value - Valor para fazer debounce
 * @param delay - Delay em milissegundos
 * @returns Valor com debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
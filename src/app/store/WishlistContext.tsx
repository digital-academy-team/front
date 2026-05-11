import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistContextType {
  courseIds: string[];
  toggle: (courseId: string) => void;
  has: (courseId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);
const STORAGE_KEY = 'digital_academy_wishlist';

function loadWishlist(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [courseIds, setCourseIds] = useState<string[]>(loadWishlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courseIds));
  }, [courseIds]);

  const toggle = (courseId: string) => {
    setCourseIds(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const has = (courseId: string) => courseIds.includes(courseId);

  return (
    <WishlistContext.Provider value={{ courseIds, toggle, has }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

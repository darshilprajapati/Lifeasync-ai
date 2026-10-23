import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface ComponentDimension {
  height?: number;
  width?: number;
}

export type PageLayoutMap = Record<string, ComponentDimension>;

const getStorageKey = (userId: number | string | undefined, pageId: string) => {
  return `lifesync_layout_${userId ?? 'guest'}_${pageId}`;
};

export const usePageLayout = (pageId: string) => {
  const { user } = useAuth();
  const storageKey = getStorageKey(user?.id, pageId);

  const [dimensions, setDimensions] = useState<PageLayoutMap>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored layout:', e);
    }
    return {};
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reload dimensions if user or page changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDimensions(JSON.parse(stored));
      } else {
        setDimensions({});
      }
    } catch {
      setDimensions({});
    }
  }, [storageKey]);

  // Listen to cross-component layout reset events
  useEffect(() => {
    const handleResetEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageId: string }>;
      if (customEvent.detail?.pageId === pageId) {
        setDimensions({});
      }
    };
    window.addEventListener('lifesync:layout-reset', handleResetEvent);
    return () => {
      window.removeEventListener('lifesync:layout-reset', handleResetEvent);
    };
  }, [pageId]);

  const getDimension = useCallback(
    (componentId: string, defaultDim?: ComponentDimension): ComponentDimension | undefined => {
      return dimensions[componentId] || defaultDim;
    },
    [dimensions]
  );

  const setDimension = useCallback(
    (componentId: string, dim: ComponentDimension) => {
      setDimensions((prev) => {
        const next = { ...prev, [componentId]: { ...prev[componentId], ...dim } };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to persist component layout:', e);
        }
        return next;
      });
    },
    [storageKey]
  );

  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('Failed to remove stored layout:', e);
    }
    setDimensions({});
    window.dispatchEvent(
      new CustomEvent('lifesync:layout-reset', { detail: { pageId } })
    );
  }, [storageKey, pageId]);

  const hasCustomLayout = Object.keys(dimensions).length > 0;

  return {
    dimensions,
    getDimension,
    setDimension,
    resetLayout,
    hasCustomLayout,
    confirmOpen,
    setConfirmOpen,
    pageId
  };
};

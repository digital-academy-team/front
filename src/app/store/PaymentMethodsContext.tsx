import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/store/AuthContext';
import { PaymentMethod } from '@/app/types';

interface PaymentMethodInput {
  nickname: string;
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

interface PaymentMethodsContextType {
  methods: PaymentMethod[];
  selectedMethodId: string | null;
  selectedMethod: PaymentMethod | null;
  hasMethods: boolean;
  addMethod: (method: PaymentMethodInput) => PaymentMethod;
  removeMethod: (id: string) => void;
  selectMethod: (id: string) => void;
}

const STORAGE_KEY_PREFIX = 'da_payment_methods';
const SELECTED_KEY_PREFIX = 'da_selected_payment_method';
const LEGACY_STORAGE_KEY = 'da_payment_methods';
const LEGACY_SELECTED_KEY = 'da_selected_payment_method';

const PaymentMethodsContext = createContext<PaymentMethodsContextType | null>(null);

function getScopeKey(userId?: string | null) {
  return userId?.trim() ? userId.trim() : null;
}

function getMethodsStorageKey(scopeKey: string | null) {
  return scopeKey ? `${STORAGE_KEY_PREFIX}:${scopeKey}` : null;
}

function getSelectedStorageKey(scopeKey: string | null) {
  return scopeKey ? `${SELECTED_KEY_PREFIX}:${scopeKey}` : null;
}

function loadMethods(storageKey: string | null): PaymentMethod[] {
  try {
    if (!storageKey) return [];
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PaymentMethod[]) : [];
  } catch {
    return [];
  }
}

function loadSelectedMethodId(storageKey: string | null): string | null {
  try {
    if (!storageKey) return null;
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function normalizeCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 19);
}

export function maskCardNumber(cardNumber: string) {
  const digits = normalizeCardNumber(cardNumber);
  const last4 = digits.slice(-4).padStart(4, '•');
  return `•••• •••• •••• ${last4}`;
}

export function PaymentMethodsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const scopeKey = getScopeKey(user?.id ?? null);
  const methodsStorageKey = getMethodsStorageKey(scopeKey);
  const selectedStorageKey = getSelectedStorageKey(scopeKey);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  useEffect(() => {
    if (!methodsStorageKey || !selectedStorageKey) {
      setMethods([]);
      setSelectedMethodId(null);
      return;
    }

    const scopedMethods = loadMethods(methodsStorageKey);
    const scopedSelected = loadSelectedMethodId(selectedStorageKey);

    if (scopedMethods.length > 0) {
      setMethods(scopedMethods);
      setSelectedMethodId(scopedSelected && scopedMethods.some((method) => method.id === scopedSelected) ? scopedSelected : scopedMethods[0].id);
      return;
    }

    try {
      const legacyMethodsRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      const legacySelected = localStorage.getItem(LEGACY_SELECTED_KEY);
      if (!legacyMethodsRaw) {
        setMethods([]);
        setSelectedMethodId(null);
        return;
      }

      const parsed = JSON.parse(legacyMethodsRaw);
      const legacyMethods = Array.isArray(parsed) ? (parsed as PaymentMethod[]) : [];
      if (legacyMethods.length === 0) {
        setMethods([]);
        setSelectedMethodId(null);
        return;
      }

      setMethods(legacyMethods);
      const nextSelected = legacySelected && legacyMethods.some((method) => method.id === legacySelected)
        ? legacySelected
        : legacyMethods[0].id;
      setSelectedMethodId(nextSelected);

      localStorage.setItem(methodsStorageKey, JSON.stringify(legacyMethods));
      localStorage.setItem(selectedStorageKey, nextSelected);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(LEGACY_SELECTED_KEY);
    } catch {
      setMethods([]);
      setSelectedMethodId(null);
    }
  }, [methodsStorageKey, selectedStorageKey]);

  useEffect(() => {
    if (!methodsStorageKey) return;
    localStorage.setItem(methodsStorageKey, JSON.stringify(methods));
  }, [methods, methodsStorageKey]);

  useEffect(() => {
    if (!methodsStorageKey || !selectedStorageKey) return;

    if (methods.length === 0) {
      if (selectedMethodId !== null) setSelectedMethodId(null);
      localStorage.removeItem(selectedStorageKey);
      return;
    }

    const selectedExists = selectedMethodId && methods.some((method) => method.id === selectedMethodId);
    const nextSelectedId = selectedExists ? selectedMethodId : methods[0].id;

    if (nextSelectedId !== selectedMethodId) {
      setSelectedMethodId(nextSelectedId);
    }

    localStorage.setItem(selectedStorageKey, nextSelectedId);
  }, [methods, selectedMethodId, methodsStorageKey, selectedStorageKey]);

  const addMethod = (method: PaymentMethodInput) => {
    const normalized: PaymentMethod = {
      id: crypto.randomUUID(),
      nickname: method.nickname.trim(),
      holderName: method.holderName.trim(),
      cardNumber: normalizeCardNumber(method.cardNumber),
      expiry: method.expiry.trim(),
      cvv: method.cvv.replace(/\D/g, '').slice(0, 4),
      createdAt: new Date().toISOString(),
    };

    setMethods((prev) => [...prev, normalized]);
    setSelectedMethodId(normalized.id);
    return normalized;
  };

  const removeMethod = (id: string) => {
    setMethods((prev) => prev.filter((method) => method.id !== id));
  };

  const selectMethod = (id: string) => {
    setSelectedMethodId(id);
  };

  const selectedMethod = useMemo(
    () => methods.find((method) => method.id === selectedMethodId) ?? null,
    [methods, selectedMethodId]
  );

  return (
    <PaymentMethodsContext.Provider
      value={{
        methods,
        selectedMethodId,
        selectedMethod,
        hasMethods: methods.length > 0,
        addMethod,
        removeMethod,
        selectMethod,
      }}
    >
      {children}
    </PaymentMethodsContext.Provider>
  );
}

export function usePaymentMethods() {
  const ctx = useContext(PaymentMethodsContext);
  if (!ctx) throw new Error('usePaymentMethods must be used within PaymentMethodsProvider');
  return ctx;
}
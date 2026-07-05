import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api.service';
import { currentPeriod } from '../utils/formatters';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const period = currentPeriod();
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetProgress, setBudgetProgress] = useState([]);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const refreshBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await api.getBalance();
      setBalance(Number(res.data?.total_balance ?? 0));
    } catch (_) {
      // silent
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const refreshSummary = useCallback(async (month, year) => {
    try {
      const m = month || period.month;
      const y = year || period.year;
      const res = await api.getSummary(m, y);
      setSummary(res.data || {});
    } catch (_) {}
  }, [period.month, period.year]);

  const refreshTransactions = useCallback(async (query = '?limit=50') => {
    try {
      const res = await api.getTransactions(query);
      setTransactions(res.data || []);
    } catch (_) {}
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await api.getCategories();
      setCategories(res.data || []);
    } catch (_) {}
  }, []);

  const refreshBudgetProgress = useCallback(async (month, year) => {
    try {
      const m = month || period.month;
      const y = year || period.year;
      const res = await api.getBudgetProgress(m, y);
      setBudgetProgress(res.data || []);
    } catch (_) {}
  }, [period.month, period.year]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshBalance(),
      refreshSummary(),
      refreshTransactions(),
      refreshCategories(),
      refreshBudgetProgress(),
    ]);
  }, [refreshBalance, refreshSummary, refreshTransactions, refreshCategories, refreshBudgetProgress]);

  return (
    <AppContext.Provider
      value={{
        balance,
        summary,
        transactions,
        categories,
        budgetProgress,
        loadingBalance,
        refreshBalance,
        refreshSummary,
        refreshTransactions,
        refreshCategories,
        refreshBudgetProgress,
        refreshAll,
        setTransactions,
        setBalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

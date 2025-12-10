import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../services/api';
import {useAuthContext} from './AuthContext';

const OrganizationContext = createContext(null);

export function OrganizationProvider({children}) {
  const {isAuthenticated} = useAuthContext();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated) {
      setOrganizations([]);
      setCurrentOrganization(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/organizations');
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch organizations', err);
      setError('Unable to load organizations.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
    }
  }, [fetchOrganizations, isAuthenticated]);

  const value = useMemo(
    () => ({
      organizations,
      currentOrganization,
      setCurrentOrganization,
      loadingOrganizations: loading,
      organizationError: error,
      refreshOrganizations: fetchOrganizations,
    }),
    [
      organizations,
      currentOrganization,
      loading,
      error,
      fetchOrganizations,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return ctx;
}


// src/components/AuthContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { type SharedData, type User } from '../types';

// Define the shape of the context value
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  can: (permission: string) => boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { props } = usePage<SharedData>();
  const { user } = props.auth;

  // Memoize the set of permissions for fast lookups
  const permissions = useMemo(() => new Set(user?.permissions || []), [user]);

  const can = (permission: string): boolean => {
    // A super-admin can do anything
    if (user?.is_admin) {
      return true;
    }

    // For basic document operations, allow all authenticated users
    const basicPermissions = [
      'documents.view',
      'documents.download',
      'documents.print'
    ];
    
    if (basicPermissions.includes(permission)) {
      return true; // Allow basic operations for all authenticated users
    }

    // For other permissions, check the user's permission list
    return permissions.has(permission);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    can,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a custom hook for easy consumption of the context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

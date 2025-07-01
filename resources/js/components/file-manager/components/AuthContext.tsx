// // src/components/AuthContext.tsx
// import React, { createContext, useContext, useMemo } from 'react';
// import { usePage } from '@inertiajs/react';
// import { type SharedData, type User } from '../types';

// // Define the shape of the context value
// interface AuthContextType {
//   user: User | null;
//   isAuthenticated: boolean;
//   can: (permission: string) => boolean;
// }

// // Create the context with a default value
// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// // Create the provider component
// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const { props } = usePage<SharedData>();
//   const { user } = props.auth;

//   // Memoize the set of permissions for fast lookups
//   const permissions = useMemo(() => new Set(user?.permissions || []), [user]);

//   const can = (permission: string): boolean => {
//     // A super-admin can do anything, regardless of the permissions list.
//     if (user?.is_admin) {
//       return true;
//     }
//     // Otherwise, check if the permission exists in the user's permissions set.
//     return permissions.has(permission);
//   };

//   const value = {
//     user,
//     isAuthenticated: !!user,
//     can,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

// // Create a custom hook for easy consumption of the context
// export const useAuth = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

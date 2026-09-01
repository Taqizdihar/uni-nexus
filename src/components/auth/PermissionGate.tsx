import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface PermissionGateProps {
  permission?: string;
  /** Backward-compatible any-of permission guard for global modules. */
  anyOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, anyOf, children, fallback }: PermissionGateProps) {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) return null;

  const allowed = permission ? hasPermission(permission) : Boolean(anyOf?.some(hasPermission));
  if (!allowed) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--nexus-charcoal)] mb-2">Akses Ditolak</h2>
        <p className="text-gray-500 max-w-md">
          Anda tidak memiliki izin yang diperlukan untuk melihat halaman ini. 
          Hubungi administrator sistem jika Anda yakin ini adalah kesalahan.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';

export default function RequireRole({ roles, children }) {
  const { user, authToken } = useWarehouse();

  if (!authToken) return <Navigate to="/login" replace />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

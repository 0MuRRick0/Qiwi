
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, fetchUserPrivileges } = useAuth();
  const [hasPrivileges, setHasPrivileges] = useState(false);
  const [privilegesLoading, setPrivilegesLoading] = useState(false);
  const [privilegesError, setPrivilegesError] = useState(null);

  useEffect(() => {
    
    const checkPrivileges = async () => {
      if (user && adminOnly) {
        setPrivilegesLoading(true);
        setPrivilegesError(null);
        try {
          
          const privileges = await fetchUserPrivileges();
          
          setHasPrivileges(!!privileges.is_staff);
        } catch (error) {
          console.error("ProtectedRoute: Failed to check privileges:", error);
          setPrivilegesError(error);
          setHasPrivileges(false);
        } finally {
          setPrivilegesLoading(false);
        }
      } else if (user) {
        
        setHasPrivileges(true);
        setPrivilegesLoading(false);
      } else {
        setHasPrivileges(false);
        setPrivilegesLoading(false);
      }
    };

    checkPrivileges();
    
  }, [user, adminOnly, fetchUserPrivileges]); 

  if (loading || privilegesLoading) return <div>Loading...</div>;
  
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !hasPrivileges) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
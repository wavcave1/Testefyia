import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function ProtectedRoute({ children, roles, teamAccess }) {
  const { currentUser, studioMemberships } = useAppContext();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // teamAccess: allow any user who has at least one studio membership (MANAGER/ENGINEER)
  if (teamAccess && studioMemberships?.length > 0) {
    return children;
  }

  if (roles && !roles.includes(currentUser.role.toLowerCase())) {
    const redirectMap = { admin: '/dashboard/admin', owner: '/dashboard/studio', client: '/dashboard/client' };
    return <Navigate to={redirectMap[currentUser.role.toLowerCase()] || '/'} replace />;
  }

  return children;
}

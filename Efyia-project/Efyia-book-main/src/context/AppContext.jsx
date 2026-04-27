import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, favoritesApi } from '../lib/api';

function deriveTeamRole(memberships, activeStudioId, currentUser) {
  if (!currentUser) return null;
  if (!activeStudioId || !memberships?.length) return null;
  const m = memberships.find((m) => m.studioId === activeStudioId);
  return m?.role || null;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('efyia_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [toast, setToast] = useState('');
  const [favoriteStudioIds, setFavoriteStudioIds] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  const [studioMemberships, setStudioMemberships] = useState([]);
  const [activeStudioId, setActiveStudioIdState] = useState(() => {
    return localStorage.getItem('efyia_active_studio') || null;
  });

  // Persist user to localStorage on change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('efyia_user', JSON.stringify(currentUser));
      if (Array.isArray(currentUser.studioMemberships)) {
        setStudioMemberships(currentUser.studioMemberships);
        // Seed activeStudioId from memberships if not already set
        setActiveStudioIdState((prev) => {
          if (prev) return prev;
          const firstId = currentUser.studioMemberships[0]?.studioId || null;
          if (firstId) localStorage.setItem('efyia_active_studio', firstId);
          return firstId;
        });
      }
    } else {
      localStorage.removeItem('efyia_user');
      localStorage.removeItem('efyia_token');
      localStorage.removeItem('efyia_active_studio');
      setFavoriteStudioIds([]);
      setFavoritesLoaded(false);
      setStudioMemberships([]);
      setActiveStudioIdState(null);
    }
  }, [currentUser]);

  // Verify token and reload user on mount (handles token expiry)
  useEffect(() => {
    const token = localStorage.getItem('efyia_token');
    if (!token || !currentUser) return;

    authApi.me().then((user) => {
      setCurrentUser(user);
      if (Array.isArray(user.studioMemberships)) {
        setStudioMemberships(user.studioMemberships);
        // Set active studio to first membership if none stored
        const stored = localStorage.getItem('efyia_active_studio');
        if (!stored && user.studioMemberships.length) {
          const firstId = user.studioMemberships[0].studioId;
          setActiveStudioIdState(firstId);
          localStorage.setItem('efyia_active_studio', firstId);
        }
      }
    }).catch(() => {
      setCurrentUser(null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load favorites when user is authenticated
  useEffect(() => {
    if (!currentUser || favoritesLoaded) return;

    favoritesApi.list().then((studios) => {
      setFavoriteStudioIds(studios.map((s) => s.id));
      setFavoritesLoaded(true);
    }).catch(() => {
      setFavoritesLoaded(true);
    });
  }, [currentUser, favoritesLoaded]);

  const setActiveStudio = useCallback((id) => {
    setActiveStudioIdState(id);
    localStorage.setItem('efyia_active_studio', id);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await authApi.login({ email, password });
    localStorage.setItem('efyia_token', token);
    setCurrentUser(user);
    setFavoritesLoaded(false);
    if (Array.isArray(user.studioMemberships) && user.studioMemberships.length) {
      const firstId = user.studioMemberships[0].studioId;
      setActiveStudioIdState(firstId);
      localStorage.setItem('efyia_active_studio', firstId);
    }
    setToast(`Welcome back, ${user.name}!`);
    return user;
  }, []);

  const signup = useCallback(async ({ name, email, password, role }) => {
    const { token, user } = await authApi.signup({ name, email, password, role });
    localStorage.setItem('efyia_token', token);
    setCurrentUser(user);
    setFavoritesLoaded(false);
    setToast('Account created. Welcome to Efyia Book.');
    return user;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setToast('Logged out successfully.');
  }, []);

  const toggleFavorite = useCallback(async (studioId) => {
    if (!currentUser) return;

    const isFavorite = favoriteStudioIds.includes(studioId);

    // Optimistic update
    setFavoriteStudioIds((current) =>
      isFavorite ? current.filter((id) => id !== studioId) : [...current, studioId],
    );

    try {
      if (isFavorite) {
        await favoritesApi.remove(studioId);
      } else {
        await favoritesApi.add(studioId);
      }
    } catch {
      // Revert on failure
      setFavoriteStudioIds((current) =>
        isFavorite ? [...current, studioId] : current.filter((id) => id !== studioId),
      );
      setToast('Could not update saved studios. Please try again.');
    }
  }, [currentUser, favoriteStudioIds]);

  const showToast = useCallback((message) => setToast(message), []);
  const reloadCurrentUser = useCallback(async () => {
    const user = await authApi.me();
    setCurrentUser(user);
    return user;
  }, []);

  const teamRole = useMemo(
    () => deriveTeamRole(studioMemberships, activeStudioId, currentUser),
    [studioMemberships, activeStudioId, currentUser],
  );

  const canEditProfile = teamRole === 'OWNER' || (!teamRole && currentUser?.role === 'owner');
  const canManageBookings = teamRole === 'OWNER' || teamRole === 'MANAGER' || (!teamRole && currentUser?.role === 'owner');
  const isReadOnly = teamRole === 'ENGINEER';

  const value = useMemo(
    () => ({
      currentUser,
      toast,
      setToast,
      showToast,
      reloadCurrentUser,
      favoriteStudioIds,
      login,
      signup,
      logout,
      toggleFavorite,
      studioMemberships,
      activeStudioId,
      setActiveStudio,
      teamRole,
      canEditProfile,
      canManageBookings,
      isReadOnly,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, favoriteStudioIds, toast, showToast, reloadCurrentUser, login, signup, logout, toggleFavorite,
      studioMemberships, activeStudioId, setActiveStudio, teamRole],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}

import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import Assessment from '../screens/Assessment';
import Reports from '../screens/Reports';
import SelectOrganization from '../screens/SelectOrganization';
import useAuth from '../hooks/useAuth';

/**
 * Centralized route orchestration without bringing in a full
 * navigation library. Keeps <App /> lean while still letting
 * us grow the UI flow from a single location.
 */
export const ROUTES = {
  LOGIN: 'Login',
  DASHBOARD: 'Dashboard',
  ASSESSMENT: 'Assessment',
  REPORTS: 'Reports',
  SELECT_ORGANIZATION: 'SelectOrganization',
};

export default function RouteNavigator() {
  const {initialized, isAuthenticated} = useAuth();
  const [currentRoute, setCurrentRoute] = useState(ROUTES.SELECT_ORGANIZATION);

  // Reset to SELECT_ORGANIZATION whenever user logs in
  useEffect(() => {
    if (initialized && isAuthenticated) {
      setCurrentRoute(ROUTES.SELECT_ORGANIZATION);
    }
  }, [initialized, isAuthenticated]);

  const navigate = useCallback(routeName => {
    setCurrentRoute(prev => {
      if (!routeName) {
        return prev;
      }
      return routeName;
    });
  }, []);

  const renderLoader = () => (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <ActivityIndicator size="large" />
    </View>
  );

  if (!initialized) {
    return renderLoader();
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  switch (currentRoute) {
    case ROUTES.DASHBOARD:
      return (
        <DashboardScreen
          onNavigate={navigate}
          currentRoute={currentRoute}
        />
      );
    case ROUTES.ASSESSMENT:
      return (
        <Assessment
          onNavigate={navigate}
          currentRoute={currentRoute}
        />
      );
    case ROUTES.REPORTS:
      return (
        <Reports
          onNavigate={navigate}
          currentRoute={currentRoute}
        />
      );
    case ROUTES.SELECT_ORGANIZATION:
    default:
      return <SelectOrganization onNavigate={navigate} />;
  }
}


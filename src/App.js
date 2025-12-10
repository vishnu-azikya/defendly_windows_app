import React from 'react';
import RouteNavigator from './navigation/RouteNavigator';
import {AuthProvider} from './context/AuthContext';
import {OrganizationProvider} from './context/OrganizationContext';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <RouteNavigator />
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;

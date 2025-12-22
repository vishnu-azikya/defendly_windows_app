import React from 'react';
import RouteNavigator from './navigation/RouteNavigator';
import {AuthProvider} from './context/AuthContext';
import {OrganizationProvider} from './context/OrganizationContext';
import {ReportProvider} from './context/ReportContext';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <ReportProvider>
          <RouteNavigator />
        </ReportProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;

import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import InitialNavBar from './common/InitialNavBar';
import SelectOrganizationTable from '../components/SelectOrgnizationTable';
import useOrganization from '../hooks/useOrganization';
import useAuth from '../hooks/useAuth';

export default function OrganizationList({onNavigate}) {
  const isDark = useColorScheme() === 'dark';
  const {
    organizations,
    loadingOrganizations,
    organizationError,
    refreshOrganizations,
    setCurrentOrganization,
  } = useOrganization();
  const {getTokenForOrg} = useAuth();
  const [processingOrg, setProcessingOrg] = useState(null);

  const handleSelectOrganization = async org => {
    if (!org?.name) {
      return;
    }
    setProcessingOrg(org.name);
    try {
      const token = await getTokenForOrg(org.name);
      if (token) {
        setCurrentOrganization(org);
        onNavigate?.('Dashboard');
      } else {
        Alert.alert('Selection failed', 'Unable to switch organization right now.');
      }
    } catch (error) {
      Alert.alert('Selection failed', 'Unable to switch organization right now.');
    } finally {
      setProcessingOrg(null);
    }
  };

  const renderStatus = () => {
    if (loadingOrganizations && organizations.length === 0) {
      return (
        <View style={styles.statusWrapper}>
          <ActivityIndicator size="large" color="#00457f" />
          <Text style={styles.statusText}>Loading organizations...</Text>
        </View>
      );
    }

    if (organizationError) {
      return (
        <View style={styles.statusWrapper}>
          <Text style={styles.statusError}>{organizationError}</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, {backgroundColor: isDark ? '#161717' : '#F1F8FD'}]}>
      <InitialNavBar />

      {renderStatus()}

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.main}
        contentContainerStyle={styles.mainContent}
        refreshControl={
          <RefreshControl
            refreshing={loadingOrganizations}
            onRefresh={refreshOrganizations}
            tintColor="#00457f"
          />
        }>
        <SelectOrganizationTable
          organizations={organizations}
          onSelect={handleSelectOrganization}
          processingOrg={processingOrg}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // full screen
  },
  main: {
    flex: 1,
    width: '100%',
    paddingTop: 70,
  },
  mainContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
    flex: 1,
    minHeight: 540,
    width: '100%',
    margin: 'auto'
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },

  tableWrapper: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 600,
    width: '100%',
  },

  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f3f3',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    width: '100%',
  },

  tableHeaderCell: {
    flex: 1,
    paddingVertical: 10,
    width: '100%',
    paddingHorizontal: 8,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
    color: '#111',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },

  tableCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111',
    textAlign: 'center',
  },
});

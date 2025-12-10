import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import useAuth from '../../hooks/useAuth';
import { useOrganizationContext } from '../../context/OrganizationContext';
import scanService from '../../services/scanService';
import Scan from '../../images/scan.png';
import dropdownArrow from '../../images/dropdownArrow.png';
import UserIcon from '../../images/user.png'; // Replace with your icon

export default function Navbar() {
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedUrl, setSelectedUrl] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUrlDropdown, setShowUrlDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [scans, setScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);
  const { logout } = useAuth();
  const { organizations, currentOrganization, loadingOrganizations, setCurrentOrganization } = useOrganizationContext();

  // Animated value for profile dropdown
  const profileAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(profileAnim, {
      toValue: showProfileDropdown ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [showProfileDropdown]);

  // Set default organization when organizations are loaded
  useEffect(() => {
    if (organizations && organizations.length > 0) {
      // Use currentOrganization if available, otherwise use first organization
      const orgToSelect = currentOrganization || organizations[0];
      const orgName = orgToSelect?.name || orgToSelect?.organizationName || orgToSelect;
      if (orgName && !selectedOrg) {
        setSelectedOrg(orgName);
        // Also update currentOrganization if not set
        if (!currentOrganization) {
          setCurrentOrganization(orgToSelect);
        }
      }
    }
  }, [organizations, currentOrganization, selectedOrg, setCurrentOrganization]);

  // Fetch scans on component mount
  useEffect(() => {
    fetchScans();
  }, []);

  // Also fetch when dropdown opens if we don't have scans
  useEffect(() => {
    if (showUrlDropdown && scans.length === 0 && !loadingScans) {
      fetchScans();
    }
  }, [showUrlDropdown]);

  const fetchScans = async () => {
    setLoadingScans(true);
    try {
      const response = await scanService.getScans(1, 10); // Fetch first 10 scans
      if (response && response.data) {
        setScans(response.data);
        // Always set default selected URL to first scan if available and no URL is selected
        if (response.data.length > 0) {
          const firstScan = response.data[0];
          const url = firstScan.scanTarget || firstScan.url || firstScan.target || firstScan.asset;
          if (url) {
            // Only update if selectedUrl is empty or not set
            setSelectedUrl(prev => prev || url);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching scans for dropdown:', error);
    } finally {
      setLoadingScans(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
      return '';
    }
  };

  // Get status display
  const getStatusDisplay = (status) => {
    const normalizedStatus = (status || '').toLowerCase();
    if (normalizedStatus.includes('complete') || normalizedStatus === 'completed' || normalizedStatus === 'success') {
      return { text: 'Completed', color: '#16a34a', showCheckmark: true };
    }
    if (normalizedStatus.includes('progress') || normalizedStatus === 'in-progress') {
      return { text: 'In Progress', color: '#f59e0b', showCheckmark: false };
    }
    if (normalizedStatus.includes('fail') || normalizedStatus === 'failed' || normalizedStatus === 'error') {
      return { text: 'Failed', color: '#dc2626', showCheckmark: false };
    }
    return { text: status || 'Unknown', color: '#6b7280', showCheckmark: false };
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.log('Logout failed', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../images/logoFull.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Ask about vulnerabilities..."
          placeholderTextColor="#666"
          style={styles.searchInput}
        />
      </View>

      {/* Organization Dropdown */}
      <View style={styles.dropdownWrapper}>
        <Pressable
          style={styles.dropdownButton}
          onPress={() => setShowOrgDropdown(!showOrgDropdown)}
        >
          <Text style={styles.dropdownText} numberOfLines={1} ellipsizeMode="tail">
            {selectedOrg || (loadingOrganizations ? 'Loading...' : 'Select organization...')}
          </Text>
          <Image source={dropdownArrow} style={{ width: 12, height: 12 }} />
        </Pressable>
        {showOrgDropdown && (
          <View style={styles.dropdownMenu}>
            {loadingOrganizations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#003C71" />
                <Text style={styles.loadingText}>Loading organizations...</Text>
              </View>
            ) : organizations && organizations.length > 0 ? (
              organizations.map((org) => {
                const orgName = org?.name || org?.organizationName || org;
                const orgId = org?.id || org?._id || org?.organizationId;
                const isSelected = selectedOrg === orgName || (currentOrganization && (currentOrganization.id === orgId || currentOrganization._id === orgId));

                return (
                  <Pressable
                    key={orgId || orgName}
                    onPress={() => {
                      setSelectedOrg(orgName);
                      setCurrentOrganization(org);
                      setShowOrgDropdown(false);
                    }}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {orgName}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No organizations available</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* URL Dropdown */}
      <View style={styles.dropdownWrapper}>
        <Pressable
          style={styles.dropdownURLButton}
          onPress={() => setShowUrlDropdown(!showUrlDropdown)}
        >
          <Text style={styles.dropdownText} numberOfLines={1} ellipsizeMode="tail">
            {selectedUrl || 'Select a scan...'}
          </Text>
          <Image source={dropdownArrow} style={{ width: 12, height: 12 }} />
        </Pressable>
        {showUrlDropdown && (
          <View style={styles.dropdownMenu}>
            {loadingScans ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#003C71" />
                <Text style={styles.loadingText}>Loading scans...</Text>
              </View>
            ) : scans.length > 0 ? (
              <ScrollView style={styles.scanListContainer} nestedScrollEnabled>
                {scans.map((scan, index) => {
                const url = scan.scanTarget || scan.url || scan.target || scan.asset || '—';
                const date = formatDate(scan.scanStart || scan.scan_date || scan.startDate || scan.createdAt);
                const status = getStatusDisplay(scan.status);
                const isSelected = selectedUrl === url;

                return (
                  <Pressable
                    key={scan.id || scan._id || scan.scan_id || index}
                    onPress={() => {
                      setSelectedUrl(url);
                      setShowUrlDropdown(false);
                    }}
                    style={[styles.scanDropdownItem, isSelected && styles.scanDropdownItemSelected]}
                  >
                    <View style={styles.scanItemContent}>
                      <View style={styles.scanItemLeft}>
                        <Text style={styles.scanUrlText} numberOfLines={1} ellipsizeMode="tail">
                          {url}
                        </Text>
                        {date && (
                          <Text style={styles.scanDateText}>{date}</Text>
                        )}
                      </View>
                      <View style={styles.scanItemRight}>
                        {status.showCheckmark && (
                          <View style={[styles.statusCheckmark, { backgroundColor: status.color, marginRight: 6 }]}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.text}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No scans available</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Scan Now Button */}
      <Pressable style={styles.scanButton}>
        <Image source={Scan} style={{ width: 18, height: 18 }} />
        <Text style={styles.scanButtonText}>Scan Now</Text>
      </Pressable>

      {/* Profile Dropdown */}
      <View style={styles.dropdownWrapper}>
        <Pressable
          style={styles.profileButton}
          onPress={() => setShowProfileDropdown(!showProfileDropdown)}
        >
          <Image source={UserIcon} style={{ width: 24, height: 24 }} />
        </Pressable>

        {showProfileDropdown && (
          <Animated.View
            style={[
              styles.profileDropdown,
              {
                opacity: profileAnim,
                transform: [
                  {
                    translateY: profileAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable style={styles.profileItem} onPress={() => console.log('Navigate to Profile')}>
              <Text style={styles.profileItemText}>Profile</Text>
            </Pressable>
            <Pressable style={styles.profileItem} onPress={() => console.log('Navigate to Settings')}>
              <Text style={styles.profileItemText}>Settings</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.profileItem} onPress={handleLogout}>
              <Text style={[styles.profileItemText, { color: '#e11d48' }]}>Logout</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable> */}
    </View>
  );
}

// --- Styles (unchanged existing styles + new dropdown styles) ---
const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 99999,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 1 },
  },
  logoContainer: { width: 160 },
  logo: { width: 150, height: 40 },
  searchContainer: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8FD',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 400,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#222', 
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowColor: 'transparent'
  },
  dropdownWrapper: { position: 'relative', zIndex: 9999, marginHorizontal: 6,marginLeft:12 },
  dropdownButton: {
    width: 120,
    height: 33,
    zIndex: 9999,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dropdownURLButton: {
    width: 180,
    height: 33,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dropdownText: { fontSize: 14, color: '#333' },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    width: '100%',
    minWidth: 280,
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    maxHeight: 400,
  },
  dropdownItem: { padding: 10 },
  dropdownItemSelected: { backgroundColor: '#eff6ff' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  dropdownItemTextSelected: { fontWeight: '600', color: '#003C71' },
  // Scan dropdown item styles
  scanDropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scanDropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  scanItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  scanUrlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  scanDateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  scanItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanListContainer: {
    maxHeight: 300,
  },
  statusCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  scanButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#003C71', height: 33, paddingHorizontal: 14, borderRadius: 8, marginLeft: 12 },
  scanButtonText: { color: '#fff', marginLeft: 6, fontSize: 11, fontWeight: '600' },
  logoutButton: { marginLeft: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, height: 33, backgroundColor: '#e11d48' },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 11 },

  // --- Profile Dropdown Styles ---
  profileButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  profileDropdown: {
    position: 'absolute',
    right: 0,
    top: 45,
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    paddingVertical: 4,
  },
  profileItem: { paddingVertical: 8, paddingHorizontal: 12 },
  profileItemText: { fontSize: 14, color: '#333' },
  divider: { height: 1, backgroundColor: '#DDD', marginVertical: 4 },
});

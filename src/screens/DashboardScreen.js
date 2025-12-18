import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import Navbar from './common/Navbar';
import Sidebar from './common/sidebar';
import Dashboard from '../components/Dashboard';

function DashboardScreen({ onNavigate, currentRoute }) {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>

      <View style={styles.bodyWrapper}>
        <View style={styles.sidebarWrapper}>
          <Sidebar onNavigate={onNavigate} currentRoute={currentRoute} />
        </View>
        <View style={styles.contentWrapper}>
          {/* <Dashboard/> */}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#F1F8FD", // light mode
  },

  navbarWrapper: {
    height: 60,
    width: "100%",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    elevation: 4,
    zIndex: 9999,
  },

  bodyWrapper: {
    flex: 1,
    flexDirection: "row",
  },

  sidebarWrapper: {
    width: 70, // collapsed width similar to web code
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e5e5",
    elevation: 4,
    zIndex: 9999,
  },

  contentWrapper: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    width: "100%",
  },
});

export default DashboardScreen;


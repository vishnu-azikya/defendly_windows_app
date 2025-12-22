import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useReport } from '../context/ReportContext';
import VulnerabilitiesTable from './dashboard/VulnerabilitiesTable';
import VulnerabilitySummaryCard from './dashboard/VulnerabilitySummaryCard';
import AssetsRiskRating from './dashboard/AssetsRiskRating';
import AttackSurfaceIndex from './dashboard/AttackSurfaceIndex';
import OpenPortsTable from './dashboard/OpenPortsTable';
import AssetsInventory from './dashboard/AssetsInventory';

export default function Dashboard() {
  const isDark = useColorScheme() === 'dark';
  const { reportData, isLoading, error, fetchLatestOpenVASReport } = useReport();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // TODO: Implement PDF download functionality
      console.log('PDF download functionality to be implemented');
      // You can use the reportDownload utility here
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading && !reportData) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <ActivityIndicator size="large" color="#00457F" />
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading Dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, isDark && styles.screenDark]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            Cyber Risk Posture
          </Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
            Executive-level insights into vulnerabilities, threats, and performance.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.downloadButton, downloading && styles.downloadButtonDisabled]}
          onPress={handleDownloadPDF}
          disabled={downloading}
        >
          <Text style={styles.downloadButtonText}>
            {downloading ? 'Generating...' : 'Download'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Two Columns Grid */}
      <View style={styles.mainGrid}>
        {/* LEFT COLUMN */}
        <View style={styles.column}>
          <VulnerabilitiesTable />
          <AssetsRiskRating />
        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.column}>
          <VulnerabilitySummaryCard />
          <View style={styles.rightGrid}>
            <View style={styles.rightGridItem}>
              <AttackSurfaceIndex />
            </View>
            <View style={styles.rightGridItem}>
              <OpenPortsTable />
            </View>
          </View>
        </View>
      </View>

      {/* Assets Inventory Section - Full Width */}
      <View style={styles.inventorySection}>
        <AssetsInventory />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F8FD',
  },
  screenDark: {
    backgroundColor: '#0D1117',
  },
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F8FD',
  },
  loadingContainerDark: {
    backgroundColor: '#0D1117',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingTextDark: {
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  titleDark: {
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  subtitleDark: {
    color: '#cccccc',
  },
  downloadButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#00457F',
    borderRadius: 6,
    justifyContent: 'center',
    height: 40,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  column: {
    flex: 1,
    gap: 20,
  },
  rightGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  rightGridItem: {
    flex: 1,
  },
  inventorySection: {
    width: '100%',
    marginTop: 20,
  },
});

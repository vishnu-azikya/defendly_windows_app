import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useReport } from '../../context/ReportContext';

const AttackSurfaceIndex = () => {
  const isDark = useColorScheme() === 'dark';
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null);
  const { reportData, isLoading, error } = useReport();

  // Extract data from Context reportData
  const attackSurfaceData = useMemo(() => {
    if (!reportData) {
      return {
        exposedServices: [],
        publicIps: [],
        openPorts: [],
        subdomains: [],
      };
    }

    const results =
      reportData?.get_reports_response?.report?.report?.results?.result || [];

    // Handle single object vs array
    const resultsArray = Array.isArray(results) ? results : results ? [results] : [];

    // Extract open ports from results
    const openPortsList = Array.from(
      new Set(
        resultsArray
          .filter((r) => r.port && r.port !== '0' && r.port !== '-1')
          .map((r) => {
            const port = r.port;
            // Extract port number if it contains protocol info
            if (port.includes('/')) {
              return port.split('/')[0]; // e.g., "80/tcp" -> "80"
            }
            return port;
          })
          .filter((p) => p && p.trim().length > 0)
      )
    ).sort((a, b) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (isNaN(aNum) || isNaN(bNum)) return 0;
      return aNum - bNum;
    }); // Sort numerically

    // Extract exposed services from vulnerability names (severity > 5.0)
    const exposedServicesList = Array.from(
      new Set(
        resultsArray
          .filter((r) => parseFloat(r.severity || '0') > 5.0)
          .map((r) => {
            const name = r.name || '';
            // Extract service name from vulnerability title
            if (name.includes('Apache')) return 'Apache HTTP Server';
            if (name.includes('jQuery')) return 'jQuery';
            if (name.includes('OpenSSL')) return 'OpenSSL';
            if (name.includes('PHP')) return 'PHP';
            if (name.includes('MySQL')) return 'MySQL';
            if (name.includes('Nginx')) return 'Nginx';
            if (name.includes('Tomcat')) return 'Apache Tomcat';
            if (name.includes('IIS')) return 'IIS';
            return name.split(' ')[0];
          })
          .filter((s) => s && s.length > 0 && s !== 'Unknown')
      )
    );

    // Extract public IPs from host information
    const publicIpsList = Array.from(
      new Set(
        resultsArray.map((r) => r.host?.__text || r.host).filter(Boolean)
      )
    );

    // Extract subdomains from descriptions
    const subdomainsList = Array.from(
      new Set(
        resultsArray
          .filter((r) => r.description)
          .flatMap((r) => {
            const matches = r.description.match(
              /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
            );
            return matches || [];
          })
          .filter((s) => s && s.length > 0)
      )
    ).slice(0, 5);

    return {
      exposedServices: exposedServicesList,
      publicIps: publicIpsList,
      openPorts: openPortsList,
      subdomains: subdomainsList,
    };
  }, [reportData]);

  const exposedAssets = attackSurfaceData.exposedServices.length;
  const openPorts = attackSurfaceData.openPorts.length;
  const publicIPs = attackSurfaceData.publicIps.length;
  const subdomains = attackSurfaceData.subdomains.length;

  // Helper to handle card click
  const handleCardClick = (type) => {
    if (detailsOpen && activeDetail === type) {
      setDetailsOpen(false);
      setActiveDetail(null);
    } else {
      setActiveDetail(type);
      setDetailsOpen(true);
    }
  };

  // Render details content based on activeDetail
  const renderDetailsContent = () => {
    switch (activeDetail) {
      case 'exposed':
        return (
          <View style={styles.detailsContent}>
            <Text style={[styles.detailsTitle, isDark && styles.detailsTitleDark]}>
              EXPOSED SERVICES ({attackSurfaceData.exposedServices.length})
            </Text>
            {attackSurfaceData.exposedServices.length > 0 ? (
              attackSurfaceData.exposedServices.map((svc, i) => (
                <Text
                  key={svc + i}
                  style={[styles.detailsItem, isDark && styles.detailsItemDark]}
                >
                  • {svc}
                </Text>
              ))
            ) : (
              <Text style={[styles.detailsItem, isDark && styles.detailsItemDark]}>
                • None
              </Text>
            )}
          </View>
        );
      case 'public':
        return (
          <View style={styles.detailsContent}>
            <Text style={[styles.detailsTitle, isDark && styles.detailsTitleDark]}>
              PUBLIC IPS ({attackSurfaceData.publicIps.length})
            </Text>
            {attackSurfaceData.publicIps.length > 0 ? (
              attackSurfaceData.publicIps.map((ip, i) => (
                <Text
                  key={ip + i}
                  style={[styles.detailsItem, isDark && styles.detailsItemDark]}
                >
                  • {ip}
                </Text>
              ))
            ) : (
              <Text style={[styles.detailsItem, isDark && styles.detailsItemDark]}>
                • None
              </Text>
            )}
          </View>
        );
      case 'ports':
        return (
          <View style={styles.detailsContent}>
            <Text style={[styles.detailsTitle, isDark && styles.detailsTitleDark]}>
              OPEN PORTS ({attackSurfaceData.openPorts.length})
            </Text>
            {attackSurfaceData.openPorts.length > 0 ? (
              attackSurfaceData.openPorts.map((port, i) => (
                <Text
                  key={`${port}${i}`}
                  style={[styles.detailsItem, isDark && styles.detailsItemDark]}
                >
                  • {port}
                </Text>
              ))
            ) : (
              <Text style={[styles.detailsItem, isDark && styles.detailsItemDark]}>
                • None
              </Text>
            )}
          </View>
        );
      case 'subdomains':
        return (
          <View style={styles.detailsContent}>
            <Text style={[styles.detailsTitle, isDark && styles.detailsTitleDark]}>
              SUBDOMAINS ({attackSurfaceData.subdomains.length})
            </Text>
            {attackSurfaceData.subdomains.length > 0 ? (
              attackSurfaceData.subdomains.map((sub, i) => (
                <Text
                  key={sub + i}
                  style={[styles.detailsItem, isDark && styles.detailsItemDark]}
                >
                  • {sub}
                </Text>
              ))
            ) : (
              <Text style={[styles.detailsItem, isDark && styles.detailsItemDark]}>
                • None
              </Text>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  // Error state
  if (error && !reportData) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          No data available
        </Text>
      </View>
    );
  }

  // Loading state
  if (isLoading && !reportData) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading data...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Attack Surface Index
        </Text>
      </View>

      {/* 4 Metric Boxes in a Row */}
      <View style={styles.metricsGrid}>
        <TouchableOpacity
          style={[
            styles.metricCard,
            isDark && styles.metricCardDark,
            activeDetail === 'exposed' && styles.metricCardActive,
          ]}
          onPress={() => handleCardClick('exposed')}
        >
          <Text style={styles.metricValue}>{exposedAssets}</Text>
          <Text style={[styles.metricLabel, isDark && styles.metricLabelDark]}>
            Exposed Services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.metricCard,
            isDark && styles.metricCardDark,
            activeDetail === 'public' && styles.metricCardActive,
          ]}
          onPress={() => handleCardClick('public')}
        >
          <Text style={[styles.metricValue, { color: '#dc2626' }]}>
            {publicIPs}
          </Text>
          <Text style={[styles.metricLabel, isDark && styles.metricLabelDark]}>
            Public IPs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.metricCard,
            isDark && styles.metricCardDark,
            activeDetail === 'ports' && styles.metricCardActive,
          ]}
          onPress={() => handleCardClick('ports')}
        >
          <Text style={[styles.metricValue, { color: '#f59e42' }]}>
            {openPorts}
          </Text>
          <Text style={[styles.metricLabel, isDark && styles.metricLabelDark]}>
            Open Ports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.metricCard,
            isDark && styles.metricCardDark,
            activeDetail === 'subdomains' && styles.metricCardActive,
          ]}
          onPress={() => handleCardClick('subdomains')}
        >
          <Text style={styles.metricValue}>{subdomains}</Text>
          <Text style={[styles.metricLabel, isDark && styles.metricLabelDark]}>
            Subdomains
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Details Section */}
      {detailsOpen && (
        <View style={[styles.detailsContainer, isDark && styles.detailsContainerDark]}>
          <ScrollView>{renderDetailsContent()}</ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
  },
  containerDark: {
    backgroundColor: '#202020',
    borderColor: '#232323',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  titleDark: {
    color: '#ffffff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  metricCardDark: {
    borderColor: '#666666',
    backgroundColor: '#1a1a1a',
  },
  metricCardActive: {
    backgroundColor: '#f3f4f6',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
  },
  metricLabelDark: {
    color: '#ffffff',
  },
  detailsContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    maxHeight: 130,
  },
  detailsContainerDark: {
    borderColor: '#666666',
    backgroundColor: '#1a1a1a',
  },
  detailsContent: {
    gap: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  detailsTitleDark: {
    color: '#ffffff',
  },
  detailsItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  detailsItemDark: {
    color: '#999',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    padding: 20,
  },
  errorTextDark: {
    color: '#ef4444',
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  loadingTextDark: {
    color: '#999',
  },
});

export default AttackSurfaceIndex;


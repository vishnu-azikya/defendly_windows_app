import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { useReport } from '../../context/ReportContext';

const OpenPortsTable = ({ showAll = false }) => {
  const isDark = useColorScheme() === 'dark';
  const { reportData, isLoading, error } = useReport();

  // Extract ports from Context data
  const ports = useMemo(() => {
    if (!reportData) return [];

    const results =
      reportData?.get_reports_response?.report?.report?.results?.result || [];

    // Handle single object vs array
    const resultsArray = Array.isArray(results) ? results : results ? [results] : [];

    // Extract UNIQUE ports (deduplicate by port+protocol)
    const portsMap = new Map();

    const serviceMap = {
      80: 'HTTP',
      443: 'HTTPS',
      22: 'SSH',
      21: 'FTP',
      25: 'SMTP',
      53: 'DNS',
      110: 'POP3',
      143: 'IMAP',
      465: 'SMTPS',
      587: 'SMTP-TLS',
      993: 'IMAPS',
      995: 'POP3S',
      3306: 'MySQL',
      5432: 'PostgreSQL',
      6379: 'Redis',
      8080: 'HTTP-Alt',
      8443: 'HTTPS-Alt',
      2052: 'Cloudflare-HTTP',
      2053: 'Cloudflare-HTTPS',
      2082: 'cPanel',
      2083: 'cPanel-SSL',
      2086: 'WHM',
      2087: 'WHM-SSL',
      2095: 'cPanel-WebMail',
      2096: 'cPanel-WebMail-SSL',
      3389: 'RDP',
      5900: 'VNC',
      27017: 'MongoDB',
      5672: 'AMQP',
      9200: 'Elasticsearch',
      9300: 'Elasticsearch-Node',
    };

    const namedServiceMap = {
      general: 'General Service',
      ssh: 'SSH',
      http: 'HTTP',
      https: 'HTTPS',
      ftp: 'FTP',
      smtp: 'SMTP',
      dns: 'DNS',
      mysql: 'MySQL',
      postgresql: 'PostgreSQL',
      redis: 'Redis',
      mongodb: 'MongoDB',
    };

    resultsArray.forEach((result) => {
      if (result?.port && result.port !== '0' && result.port !== '-1') {
        const portStr = result.port?.toString() || '';

        // Extract protocol (tcp/udp)
        const protocol = portStr.includes('/udp') ? 'udp' : 'tcp';

        // Try to extract numeric port first
        const numericMatch = portStr.match(/^(\d+)\//);

        if (numericMatch) {
          // Numeric port like "22/tcp", "80/tcp", "443/tcp"
          const portNum = parseInt(numericMatch[1]);
          const service = serviceMap[portNum] || 'Unknown';
          // Use port+protocol as unique key (not index)
          const uniqueKey = `${portNum}-${protocol}`;

          // Only add if not already in map (deduplicates)
          if (!portsMap.has(uniqueKey)) {
            portsMap.set(uniqueKey, {
              id: uniqueKey,
              port: portNum,
              service: service,
              protocol: protocol,
              state: 'Open',
              riskLevel: 'Active',
            });
          }
        } else {
          // Named port like "general/tcp", "general/CPE-T"
          const namedPortMatch = portStr.match(/^([a-zA-Z]+)/i);
          if (namedPortMatch) {
            const portName = namedPortMatch[1].toLowerCase();
            const service =
              namedServiceMap[portName] ||
              portName.charAt(0).toUpperCase() + portName.slice(1);
            const uniqueKey = `${portName}-${protocol}`;

            // Only add if not already in map (deduplicates)
            if (!portsMap.has(uniqueKey)) {
              portsMap.set(uniqueKey, {
                id: uniqueKey,
                port: 0, // No numeric port
                service: service,
                protocol: protocol,
                state: 'Open',
                riskLevel: 'Active',
              });
            }
          }
        }
      }
    });

    // Convert map to array and sort by port number (named ports go to end)
    return Array.from(portsMap.values()).sort((a, b) => {
      if (a.port === 0 && b.port === 0) return 0; // Both named, keep order
      if (a.port === 0) return 1; // Named ports go to end
      if (b.port === 0) return -1; // Numeric ports first
      return a.port - b.port; // Sort numeric ports
    });
  }, [reportData]);

  const displayedPorts = showAll ? ports : ports;

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
          Loading ports...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Open Ports & Services
        </Text>
      </View>

      {/* Scrollable Table */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader, isDark && styles.tableHeaderDark]}>
            <View style={styles.portColumn}>
              <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
                Port
              </Text>
            </View>
            <View style={styles.serviceColumn}>
              <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
                Service
              </Text>
            </View>
          </View>

          {/* Table Body */}
          {displayedPorts.length > 0 ? (
            displayedPorts.map((port) => (
              <View
                key={port.id}
                style={[
                  styles.tableRow,
                  styles.tableBodyRow,
                  isDark && styles.tableBodyRowDark,
                ]}
              >
                <View style={styles.portColumn}>
                  <Text
                    style={[styles.portText, isDark && styles.portTextDark]}
                  >
                    {port.port > 0 ? `${port.port}/${port.protocol}` : port.protocol}
                  </Text>
                </View>
                <View style={styles.serviceColumn}>
                  <Text
                    style={[styles.serviceText, isDark && styles.serviceTextDark]}
                  >
                    {port.service}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                No open ports found
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    height: 420,
  },
  containerDark: {
    backgroundColor: '#202020',
    borderColor: '#232323',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  titleDark: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  table: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
  },
  tableHeaderDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  tableBodyRow: {
    backgroundColor: '#ffffff',
  },
  tableBodyRowDark: {
    backgroundColor: '#202020',
    borderBottomColor: '#333',
  },
  portColumn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  serviceColumn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    textTransform: 'uppercase',
  },
  headerTextDark: {
    color: '#ffffff',
  },
  portText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#111',
  },
  portTextDark: {
    color: '#ffffff',
  },
  serviceText: {
    fontSize: 14,
    color: '#111',
  },
  serviceTextDark: {
    color: '#ffffff',
  },
  emptyRow: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  emptyTextDark: {
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

export default OpenPortsTable;


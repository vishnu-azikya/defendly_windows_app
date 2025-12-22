import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useReport } from '../../context/ReportContext';

const VulnerabilitiesTable = ({
  vulnerabilities: propVulnerabilities,
  onFilterChange = () => {},
  showAll = false,
}) => {
  const isDark = useColorScheme() === 'dark';
  const { reportData, isLoading, error } = useReport();

  const [sortField, setSortField] = useState('severity');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  // Helper function to extract CVEs
  const extractCVEs = (result) => {
    const cveIds = [];
    if (result?.nvt?.refs?.ref) {
      const refs = Array.isArray(result.nvt.refs.ref)
        ? result.nvt.refs.ref
        : [result.nvt.refs.ref];
      refs.forEach((ref) => {
        if (ref._type === 'cve' && ref._id) {
          cveIds.push(ref._id);
        }
      });
    }
    return cveIds;
  };

  // Helper function to get threat level from CVSS
  const getThreatLevelFromCvss = (cvss) => {
    if (cvss > 9.0) return 'critical';
    if (cvss > 7.0) return 'high';
    if (cvss > 4.0) return 'medium';
    if (cvss > 0) return 'low';
    return 'info';
  };

  // Extract vulnerabilities from Report Context
  const contextVulnerabilities = useMemo(() => {
    if (!reportData) return [];

    const results =
      reportData?.get_reports_response?.report?.report?.results?.result || [];

    // Handle single object vs array
    const resultsArray = Array.isArray(results) ? results : results ? [results] : [];

    // Extract ALL vulnerabilities and map them
    const mapped = resultsArray
      .map((result) => ({
        id: result._id || Math.random().toString(),
        name: result.name || 'Unknown Vulnerability',
        severity: getThreatLevelFromCvss(parseFloat(result.severity || '0')),
        endpoint: result.host?.__text || result.host || 'Unknown Host',
        description: result.description || '',
        cvssScore: parseFloat(result.severity || '0'),
        cves: extractCVEs(result),
        evidence: [result.description || ''],
        solutions: [result.solution || result.description || ''],
        status: 'active',
      }))
      .sort((a, b) => b.cvssScore - a.cvssScore);

    return mapped;
  }, [reportData]);

  const [displayedVulnerabilities, setDisplayedVulnerabilities] = useState([]);

  useEffect(() => {
    setDisplayedVulnerabilities(
      contextVulnerabilities.map((v) => ({
        ...v,
        severity: ['critical', 'high', 'medium', 'low', 'info'].includes(
          v.severity.toLowerCase()
        )
          ? v.severity.toLowerCase()
          : 'info',
      }))
    );
  }, [contextVulnerabilities]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRowExpanded = (id) => {
    setExpandedRows((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (key !== id) newState[key] = false;
      });
      newState[id] = !prev[id];
      return newState;
    });
  };

  const handleFilterChange = (severity) => {
    setSelectedSeverity(severity);
    onFilterChange(severity);
    setExpandedRows({});

    let filtered = severity
      ? contextVulnerabilities.filter(
          (v) => v.severity.toLowerCase() === severity.toLowerCase()
        )
      : contextVulnerabilities;

    filtered = [...filtered].sort((a, b) => {
      if (sortField === 'severity') {
        const severityOrder = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
          info: 0,
        };
        const aValue =
          severityOrder[a.severity.toLowerCase()] || 0;
        const bValue =
          severityOrder[b.severity.toLowerCase()] || 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    setDisplayedVulnerabilities(showAll ? filtered : filtered.slice(0, 5));
  };

  useEffect(() => {
    handleFilterChange(selectedSeverity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortDirection, contextVulnerabilities]);

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
          Loading vulnerability data...
        </Text>
      </View>
    );
  }

  const severityFilters = [
    { label: 'All', value: null },
    { label: 'Critical', value: 'critical', color: '#7f1d1d' },
    { label: 'High', value: 'high', color: '#dc2626' },
    { label: 'Medium', value: 'medium', color: '#fbbf24' },
    { label: 'Low', value: 'low', color: '#16a34a' },
    { label: 'Info', value: 'info', color: '#0ea5e9' },
  ];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Top Vulnerabilities
        </Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {severityFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value || 'all'}
            style={[
              styles.filterButton,
              selectedSeverity === filter.value && styles.filterButtonActive,
              filter.color &&
                selectedSeverity === filter.value && {
                  backgroundColor: filter.color,
                },
            ]}
            onPress={() => handleFilterChange(filter.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedSeverity === filter.value && styles.filterButtonTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Table */}
      <ScrollView
        style={styles.tableContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableHeader, isDark && styles.tableHeaderDark]}>
            <View style={styles.expandColumn}>
              <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
                {' '}
              </Text>
            </View>
            <View style={styles.nameColumn}>
              <TouchableOpacity onPress={() => handleSort('name')}>
                <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
                  Vulnerability
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cvssColumn}>
              <TouchableOpacity onPress={() => handleSort('cvssScore')}>
                <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
                  CVSS
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.hostColumn}>
              <TouchableOpacity onPress={() => handleSort('endpoint')}>
                <Text style={[styles.headerText, isDark && styles.headerTextDark]}>
                  Host
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Table Body */}
          {displayedVulnerabilities.length > 0 ? (
            displayedVulnerabilities.map((vuln) => (
              <View key={vuln.id}>
                <TouchableOpacity
                  style={[
                    styles.tableRow,
                    expandedRows[vuln.id] && styles.tableRowExpanded,
                    isDark && styles.tableRowDark,
                  ]}
                  onPress={() => toggleRowExpanded(vuln.id)}
                >
                  <View style={styles.expandColumn}>
                    <Text style={styles.expandIcon}>
                      {expandedRows[vuln.id] ? '▼' : '▶'}
                    </Text>
                  </View>
                  <View style={styles.nameColumn}>
                    <Text
                      style={[styles.vulnName, isDark && styles.vulnNameDark]}
                      numberOfLines={1}
                    >
                      {vuln.name}
                    </Text>
                  </View>
                  <View style={styles.cvssColumn}>
                    <View style={styles.cvssBadge}>
                      <Text style={styles.cvssText}>
                        {vuln.cvssScore?.toFixed(1) || vuln.severity}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.hostColumn}>
                    <Text
                      style={[styles.hostText, isDark && styles.hostTextDark]}
                      numberOfLines={1}
                    >
                      {vuln.endpoint}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Details */}
                {expandedRows[vuln.id] && (
                  <View
                    style={[
                      styles.expandedContent,
                      isDark && styles.expandedContentDark,
                    ]}
                  >
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailsSection}>
                        <Text
                          style={[
                            styles.detailsTitle,
                            isDark && styles.detailsTitleDark,
                          ]}
                        >
                          Description
                        </Text>
                        <Text
                          style={[
                            styles.detailsText,
                            isDark && styles.detailsTextDark,
                          ]}
                        >
                          {vuln.description || 'No description available'}
                        </Text>
                        {vuln.cves && vuln.cves.length > 0 && (
                          <>
                            <Text
                              style={[
                                styles.detailsTitle,
                                isDark && styles.detailsTitleDark,
                                { marginTop: 16 },
                              ]}
                            >
                              CVEs ({vuln.cves.length})
                            </Text>
                            <View style={styles.cveContainer}>
                              {vuln.cves.slice(0, 5).map((cve, idx) => (
                                <View
                                  key={idx}
                                  style={[
                                    styles.cveBadge,
                                    isDark && styles.cveBadgeDark,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.cveText,
                                      isDark && styles.cveTextDark,
                                    ]}
                                  >
                                    {cve}
                                  </Text>
                                </View>
                              ))}
                              {vuln.cves.length > 5 && (
                                <Text
                                  style={[
                                    styles.moreText,
                                    isDark && styles.moreTextDark,
                                  ]}
                                >
                                  +{vuln.cves.length - 5} more
                                </Text>
                              )}
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                No vulnerabilities found
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
    flex: 1,
    minHeight: 400,
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
  filterContainer: {
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#00457f',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  tableContainer: {
    flex: 1,
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tableHeaderDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  expandColumn: {
    width: 30,
    alignItems: 'center',
  },
  nameColumn: {
    flex: 2,
    paddingHorizontal: 8,
  },
  cvssColumn: {
    width: 80,
    alignItems: 'center',
  },
  hostColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
    textTransform: 'uppercase',
  },
  headerTextDark: {
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  tableRowExpanded: {
    backgroundColor: '#f9f9f9',
  },
  tableRowDark: {
    backgroundColor: '#202020',
    borderBottomColor: '#333',
  },
  expandIcon: {
    fontSize: 10,
    color: '#666',
  },
  vulnName: {
    fontSize: 14,
    color: '#111',
  },
  vulnNameDark: {
    color: '#ffffff',
  },
  cvssBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cvssText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  hostText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111',
  },
  hostTextDark: {
    color: '#ffffff',
  },
  expandedContent: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  expandedContentDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },
  detailsGrid: {
    gap: 16,
  },
  detailsSection: {
    gap: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailsTitleDark: {
    color: '#999',
  },
  detailsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  detailsTextDark: {
    color: '#cccccc',
  },
  cveContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  cveBadge: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cveBadgeDark: {
    borderColor: '#666',
    backgroundColor: '#181818',
  },
  cveText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#111',
  },
  cveTextDark: {
    color: '#ffffff',
  },
  moreText: {
    fontSize: 12,
    color: '#666',
  },
  moreTextDark: {
    color: '#999',
  },
  emptyRow: {
    padding: 40,
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

export default VulnerabilitiesTable;


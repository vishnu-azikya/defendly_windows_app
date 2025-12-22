import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
} from 'react-native';
import { useReport } from '../../context/ReportContext';

// Helper for CVSS color
const getCvssColor = (score) => {
  if (score > 9.5) return { bg: '#7f1d1d', text: '#ffffff' };
  if (score > 7.0) return { bg: '#dc2626', text: '#ffffff' };
  if (score > 5.0) return { bg: '#fbbf24', text: '#000000' };
  if (score > 0) return { bg: '#16a34a', text: '#ffffff' };
  return { bg: '#9ca3af', text: '#000000' };
};

const getThreatColor = (threat) => {
  switch (threat?.toLowerCase()) {
    case 'critical':
      return '#dc2626';
    case 'high':
      return '#dc2626';
    case 'medium':
      return '#fbbf24';
    case 'low':
      return '#16a34a';
    default:
      return '#666';
  }
};

const getThreatLevelFromCvss = (cvss) => {
  if (cvss > 9.5) return 'Critical';
  if (cvss > 7.0) return 'High';
  if (cvss > 5.0) return 'Medium';
  return 'Low';
};

const CveBadge = ({ cve, isDark }) => (
  <View style={[styles.cveBadge, isDark && styles.cveBadgeDark]}>
    <Text style={[styles.cveBadgeText, isDark && styles.cveBadgeTextDark]}>
      {cve}
    </Text>
  </View>
);

const AssetsInventory = () => {
  const isDark = useColorScheme() === 'dark';
  const { reportData, isLoading, error } = useReport();
  const [expanded, setExpanded] = useState(null);

  // Filter states
  const [severityFilter, setSeverityFilter] = useState('All');
  const [cvssMin, setCvssMin] = useState(0);
  const [cvssMax, setCvssMax] = useState(10);
  const [portFilter, setPortFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Get results array from data
  const getResults = () => {
    let resultsData =
      reportData?.get_reports_response?.report?.report?.results?.result;

    // If results is a single object (not array), convert to array
    if (resultsData && !Array.isArray(resultsData)) {
      resultsData = [resultsData];
    }

    return resultsData || [];
  };

  const results = getResults();

  // Extract CVEs from refs array
  const extractCVEs = (result) => {
    const cveIds = [];
    if (result?.nvt?.refs?.ref && Array.isArray(result.nvt.refs.ref)) {
      result.nvt.refs.ref.forEach((ref) => {
        if (ref._type === 'cve' && ref._id) {
          cveIds.push(ref._id);
        }
      });
    }
    return cveIds;
  };

  // Get all unique ports for dropdown
  const allPorts = useMemo(() => {
    return Array.from(new Set(results.map((r) => r.port).filter(Boolean)));
  }, [results]);

  // Get severity sort order
  const getSeveritySortOrder = (cvss) => {
    if (cvss > 9.5) return 0; // Critical - highest priority
    if (cvss > 7.0) return 1; // High
    if (cvss > 5.0) return 2; // Medium
    return 3; // Low
  };

  // Filtering logic
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const cvss = parseFloat(result.severity || '0');
      const computedThreat = getThreatLevelFromCvss(cvss);

      if (
        severityFilter !== 'All' &&
        computedThreat.toLowerCase() !== severityFilter.toLowerCase()
      ) {
        return false;
      }
      if (cvssMin && cvss < cvssMin) {
        return false;
      }
      if (cvssMax && cvss > cvssMax) {
        return false;
      }
      if (portFilter !== 'All' && result.port !== portFilter) {
        return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const name = (result.name || '').toLowerCase();
        const cves = extractCVEs(result).join(' ').toLowerCase();
        if (!name.includes(s) && !cves.includes(s)) {
          return false;
        }
      }
      return true;
    });
  }, [results, severityFilter, cvssMin, cvssMax, portFilter, search]);

  // SORT BY SEVERITY - Critical at top, Low at bottom
  const sortedFilteredResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const cvssA = parseFloat(a.severity || '0');
      const cvssB = parseFloat(b.severity || '0');

      const sortOrderA = getSeveritySortOrder(cvssA);
      const sortOrderB = getSeveritySortOrder(cvssB);

      // If same severity level, sort by CVSS score (descending)
      if (sortOrderA === sortOrderB) {
        return cvssB - cvssA;
      }

      return sortOrderA - sortOrderB;
    });
  }, [filteredResults]);

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(sortedFilteredResults.length / rowsPerPage);

  // Paginated results
  const paginatedResults = sortedFilteredResults.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Reset filter handler
  const handleResetFilters = () => {
    setSeverityFilter('All');
    setCvssMin(0);
    setCvssMax(10);
    setPortFilter('All');
    setSearch('');
    setPage(1);
  };

  // Error state
  if (error && !reportData) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.errorText, isDark && styles.errorTextDark]}>
          Failed to Load Latest Report: {error}
        </Text>
      </View>
    );
  }

  // Loading state
  if (isLoading && !reportData) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.loadingText, isDark && styles.loadingTextDark]}>
          Loading latest VA report...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* First Row - Severity, CVSS Range, Port */}
        <View style={styles.filterRow}>
          <View style={styles.filterGroup}>
            <Text
              style={[styles.filterLabel, isDark && styles.filterLabelDark]}
            >
              Severity
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterButtons}>
                {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
                  <TouchableOpacity
                    key={sev}
                    style={[
                      styles.filterButton,
                      severityFilter === sev && styles.filterButtonActive,
                    ]}
                    onPress={() => {
                      setSeverityFilter(sev);
                      setPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        severityFilter === sev &&
                          styles.filterButtonTextActive,
                      ]}
                    >
                      {sev}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterGroup}>
            <Text
              style={[styles.filterLabel, isDark && styles.filterLabelDark]}
            >
              CVSS Range
            </Text>
            <View style={styles.cvssRange}>
              <TextInput
                style={[
                  styles.cvssInput,
                  isDark && styles.cvssInputDark,
                ]}
                value={cvssMin.toString()}
                onChangeText={(text) => {
                  const val = parseFloat(text) || 0;
                  setCvssMin(val);
                  setPage(1);
                }}
                keyboardType="numeric"
                placeholder="0"
              />
              <Text style={[styles.rangeSeparator, isDark && styles.rangeSeparatorDark]}>–</Text>
              <TextInput
                style={[
                  styles.cvssInput,
                  isDark && styles.cvssInputDark,
                ]}
                value={cvssMax.toString()}
                onChangeText={(text) => {
                  const val = parseFloat(text) || 10;
                  setCvssMax(val);
                  setPage(1);
                }}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text
              style={[styles.filterLabel, isDark && styles.filterLabelDark]}
            >
              Port
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    portFilter === 'All' && styles.filterButtonActive,
                  ]}
                  onPress={() => {
                    setPortFilter('All');
                    setPage(1);
                  }}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      portFilter === 'All' && styles.filterButtonTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {allPorts.slice(0, 10).map((port) => (
                  <TouchableOpacity
                    key={port}
                    style={[
                      styles.filterButton,
                      portFilter === port && styles.filterButtonActive,
                    ]}
                    onPress={() => {
                      setPortFilter(port);
                      setPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        portFilter === port && styles.filterButtonTextActive,
                      ]}
                    >
                      {port}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Second Row - Search and Reset */}
        <View style={styles.filterRowSecond}>
          <View style={styles.searchGroup}>
            <TextInput
              style={[styles.searchInput, isDark && styles.searchInputDark]}
              placeholder="Search by name, CVE, or solution"
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setPage(1);
              }}
            />
          </View>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetFilters}
          >
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Section */}
      <ScrollView style={styles.tableScrollView}>
        <View style={[styles.table, isDark && styles.tableDark]}>
          {/* Table Header */}
          <View style={[styles.tableHeader, isDark && styles.tableHeaderDark]}>
            <Text style={[styles.headerCell, styles.serialCell, isDark && styles.headerCellDark]}>
              S.NO.
            </Text>
            <Text style={[styles.headerCell, styles.hostCell, isDark && styles.headerCellDark]}>
              HOST
            </Text>
            <Text style={[styles.headerCell, styles.portCell, isDark && styles.headerCellDark]}>
              PORT
            </Text>
            <Text style={[styles.headerCell, styles.cvssCell, isDark && styles.headerCellDark]}>
              CVSS SCORE
            </Text>
            <Text style={[styles.headerCell, styles.threatCell, isDark && styles.headerCellDark]}>
              THREAT LEVEL
            </Text>
            <Text style={[styles.headerCell, styles.cveCell, isDark && styles.headerCellDark]}>
              CVEs
            </Text>
          </View>

          {/* Table Body */}
          {paginatedResults.map((result, idx) => {
            const cvss = parseFloat(result.severity || '0');
            const computedThreat = getThreatLevelFromCvss(cvss);
            const cves = extractCVEs(result);
            const rowIndex = (page - 1) * rowsPerPage + idx + 1;
            const cvssColors = getCvssColor(cvss);
            const isExpanded = expanded === idx;

            return (
              <View key={result._id || idx + (page - 1) * rowsPerPage}>
                <TouchableOpacity
                  style={[
                    styles.tableRow,
                    isExpanded && styles.tableRowExpanded,
                    isDark && styles.tableRowDark,
                  ]}
                  onPress={() => setExpanded(isExpanded ? null : idx)}
                >
                  <Text style={[styles.cell, styles.serialCell, isDark && styles.cellDark]}>
                    {rowIndex}
                  </Text>
                  <Text
                    style={[styles.cell, styles.hostCell, isDark && styles.cellDark]}
                    numberOfLines={1}
                  >
                    {result.host?.__text || result.host || '-'}
                  </Text>
                  <Text style={[styles.cell, styles.portCell, isDark && styles.cellDark]}>
                    {result.port || '-'}
                  </Text>
                  <View style={[styles.cell, styles.cvssCell]}>
                    <View
                      style={[
                        styles.cvssBadge,
                        { backgroundColor: cvssColors.bg },
                      ]}
                    >
                      <Text
                        style={[styles.cvssBadgeText, { color: cvssColors.text }]}
                      >
                        {parseFloat(result.severity || '0').toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.cell,
                      styles.threatCell,
                      { 
                        color: getThreatColor(computedThreat), 
                        fontWeight: computedThreat === 'Critical' || computedThreat === 'High' ? '700' : '600',
                      },
                    ]}
                  >
                    {computedThreat}
                  </Text>
                  <View style={[styles.cell, styles.cveCell]}>
                    {cves.length === 0 ? (
                      <Text style={[styles.emptyCve, isDark && styles.emptyCveDark]}>-</Text>
                    ) : (
                      <View style={styles.cveRow}>
                        {cves.slice(0, 2).map((cve, i) => (
                          <CveBadge key={cve + i} cve={cve} isDark={isDark} />
                        ))}
                        {cves.length > 2 && (
                          <Text
                            style={[styles.moreCve, isDark && styles.moreCveDark]}
                          >
                            + {cves.length - 2} More
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Expanded Details */}
                {isExpanded && (
                  <View
                    style={[
                      styles.expandedDetails,
                      isDark && styles.expandedDetailsDark,
                    ]}
                  >
                    <Text
                      style={[styles.detailTitle, isDark && styles.detailTitleDark]}
                    >
                      {result.name || '-'}
                    </Text>
                    <Text
                      style={[styles.detailDescription, isDark && styles.detailDescriptionDark]}
                    >
                      {result.description?.split('\n')[0] || '-'}
                    </Text>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailSection}>
                        <Text
                          style={[styles.detailSectionTitle, isDark && styles.detailSectionTitleDark]}
                        >
                          CVEs ({cves.length})
                        </Text>
                        <View style={styles.detailCves}>
                          {cves.map((cve, i) => (
                            <CveBadge key={cve + i} cve={cve} isDark={isDark} />
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}

          {paginatedResults.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                No vulnerabilities found.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pagination Controls */}
      <View style={styles.pagination}>
        <Text style={[styles.paginationText, isDark && styles.paginationTextDark]}>
          Showing{' '}
          {sortedFilteredResults.length === 0
            ? 0
            : (page - 1) * rowsPerPage + 1}
          -{Math.min(page * rowsPerPage, sortedFilteredResults.length)} of{' '}
          {sortedFilteredResults.length}
        </Text>
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              page === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <Text
              style={[
                styles.paginationButtonText,
                page === 1 && styles.paginationButtonTextDisabled,
                isDark && styles.paginationButtonTextDark,
              ]}
            >
              Prev
            </Text>
          </TouchableOpacity>
          <Text style={[styles.paginationPage, isDark && styles.paginationPageDark]}>
            Page {page} of {totalPages || 1}
          </Text>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              (page === totalPages || totalPages === 0) &&
                styles.paginationButtonDisabled,
            ]}
            onPress={() => setPage(page + 1)}
            disabled={page === totalPages || totalPages === 0}
          >
            <Text
              style={[
                styles.paginationButtonText,
                (page === totalPages || totalPages === 0) &&
                  styles.paginationButtonTextDisabled,
                isDark && styles.paginationButtonTextDark,
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
  },
  containerDark: {
    backgroundColor: '#202020',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterRowSecond: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  filterGroup: {
    flex: 1,
    minWidth: 200,
  },
  filterItem: {
    marginBottom: 12,
  },
  searchGroup: {
    flex: 1,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  filterLabelDark: {
    color: '#999',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#00457f',
    borderColor: '#00457f',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cvssRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cvssInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  cvssInputDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#666',
    color: '#ffffff',
  },
  rangeSeparator: {
    fontSize: 14,
    color: '#666',
  },
  rangeSeparatorDark: {
    color: '#999',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  searchInputDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#666',
    color: '#ffffff',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tableScrollView: {
    maxHeight: 600,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableDark: {
    borderColor: '#333',
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
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111',
    textTransform: 'uppercase',
  },
  headerCellDark: {
    color: '#ffffff',
  },
  serialCell: {
    width: 60,
  },
  hostCell: {
    flex: 2,
  },
  portCell: {
    width: 80,
  },
  cvssCell: {
    width: 100,
  },
  threatCell: {
    width: 100,
  },
  cveCell: {
    flex: 2,
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
  cell: {
    fontSize: 14,
    color: '#111',
  },
  cellDark: {
    color: '#ffffff',
  },
  cvssBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  cvssBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  cveBadge: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  cveBadgeDark: {
    borderColor: '#666',
    backgroundColor: '#2a2a2a',
  },
  cveBadgeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#111',
  },
  cveBadgeTextDark: {
    color: '#ffffff',
  },
  emptyCve: {
    fontSize: 14,
    color: '#999',
  },
  emptyCveDark: {
    color: '#666',
  },
  moreCve: {
    fontSize: 12,
    color: '#666',
  },
  moreCveDark: {
    color: '#999',
  },
  expandedDetails: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  expandedDetailsDark: {
    backgroundColor: '#181818',
    borderBottomColor: '#333',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  detailTitleDark: {
    color: '#ffffff',
  },
  detailDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  detailDescriptionDark: {
    color: '#cccccc',
  },
  detailGrid: {
    gap: 16,
  },
  detailSection: {
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  detailSectionTitleDark: {
    color: '#999',
  },
  detailCves: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyState: {
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  paginationText: {
    fontSize: 12,
    color: '#666',
  },
  paginationTextDark: {
    color: '#999',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: '#666',
  },
  paginationButtonTextDark: {
    color: '#999',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  paginationPage: {
    fontSize: 14,
    color: '#666',
  },
  paginationPageDark: {
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

export default AssetsInventory;


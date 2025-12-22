import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useReport } from '../../context/ReportContext';

const AssetsRiskRating = () => {
  const isDark = useColorScheme() === 'dark';
  const { reportData, isLoading, error } = useReport();

  // Extract vulnerability counts from Report Context
  const vulnerabilityCounts = useMemo(() => {
    if (!reportData) {
      return {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: 0,
      };
    }

    const results =
      reportData?.get_reports_response?.report?.report?.results?.result || [];

    // Handle single object vs array
    const resultsArray = Array.isArray(results) ? results : results ? [results] : [];

    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    resultsArray.forEach((result) => {
      const cvss = parseFloat(result.severity || '0');
      if (cvss > 9.0) {
        counts.critical++;
      } else if (cvss > 7.0) {
        counts.high++;
      } else if (cvss > 4.0) {
        counts.medium++;
      } else if (cvss > 0) {
        counts.low++;
      } else if (cvss === 0) {
        counts.info++;
      }
    });

    return {
      critical: counts.critical,
      high: counts.high,
      medium: counts.medium,
      low: counts.low,
      info: counts.info,
      total: resultsArray.length,
    };
  }, [reportData]);

  const barData = [
    { severity: 'Critical', count: vulnerabilityCounts.critical, color: '#7f1d1d' },
    { severity: 'High', count: vulnerabilityCounts.high, color: '#dc2626' },
    { severity: 'Medium', count: vulnerabilityCounts.medium, color: '#f59e42' },
    { severity: 'Low', count: vulnerabilityCounts.low, color: '#22c55e' },
    { severity: 'Info', count: vulnerabilityCounts.info, color: '#3b82f6' },
  ];

  const maxCount = Math.max(...barData.map((d) => d.count), 1);

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
      <View style={styles.header}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          Asset Risk by Severity
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {barData.map((entry, index) => {
            const heightPercentage = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
            const barHeight = Math.max((heightPercentage / 100) * 200, entry.count > 0 ? 20 : 0);

            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  {/* Bar */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: entry.color,
                      },
                    ]}
                  >
                    {/* Value Label at Top of Bar */}
                    {entry.count > 0 && (
                      <View style={styles.valueLabelContainer}>
                        <Text style={styles.valueLabel}>{entry.count}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[styles.xAxisLabel, isDark && styles.xAxisLabelDark]}>
                  {entry.severity}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
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
    minHeight: 300,
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
  chartContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 250,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 250,
    paddingHorizontal: 8,
    paddingBottom: 30,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barContainer: {
    width: '70%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  valueLabelContainer: {
    position: 'absolute',
    top: 4,
    width: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  valueLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
  },
  xAxisLabel: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  xAxisLabelDark: {
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

export default AssetsRiskRating;


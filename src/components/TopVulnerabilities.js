import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import Info from '../images/info.png';
import DropdownArrow from '../images/dropdownArrow.png';

export default function TopVulnerabilities() {
  const [expanded, setExpanded] = useState(null);

  const staticData = [
    {
      id: 1,
      name: "Content Security Policy (CSP) Header Not Set",
      severity: "Medium",
      endpoint: "https://test.com",
    },
    {
      id: 2,
      name: "Permissions Policy Header Not Set",
      severity: "Low",
      endpoint: "https://test.com",
    },
    {
      id: 3,
      name: "Strict-Transport-Security Header Not Set",
      severity: "Low",
      endpoint: "https://test.com",
    },
    {
      id: 4,
      name: "Non-Storable Content",
      severity: "Info",
      endpoint: "https://test.com",
    },
    {
      id: 5,
      name: "User Agent Fuzzer",
      severity: "Info",
      endpoint: "https://test.com",
    },
  ];

  const toggleExpand = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Top Vulnerabilities</Text>
        <Image source={Info} style={styles.infoImage} />
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={{ maxWidth: '5%', minWidth: '5%' }}>

        </View>
        <View style={[styles.th, { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", minWidth: '45%', maxWidth: '45%' }]}>
          <Text style={styles.th}>Vulnerability</Text>
          <Image source={DropdownArrow} style={{ width: 12, height: 12, marginLeft: 5, marginRight: 'auto' }} />
        </View>
        <Text style={[styles.th, { width: "25%" }]}>Severity</Text>
        <Text style={[styles.th, { width: "25%" }]}>Endpoint</Text>
      </View>

      <ScrollView style={{ maxHeight: 320 }}>
        {staticData.map((item) => (
          <View key={item.id}>
            {/* Row */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => toggleExpand(item.id)}
            >
              <View style={{ maxWidth: '5%', minWidth: '5%' }}>
                <Image source={DropdownArrow} style={{ width: 12, height: 12, marginLeft: 5, marginRight: 'auto' }} />
              </View>
              <Text style={[styles.td, { width: "45%" }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ maxWidth: '25%', minWidth: '25%' }}>

                <View style={[styles.severityBadge, styles[item.severity.toLowerCase()]]}>
                  <Text style={styles.badgeText}>{item.severity}</Text>
                </View>
              </View>
              <Text style={[styles.endpoint, { maxWidth: '25%', minWidth: '25%' }]} numberOfLines={1}>
                {item.endpoint}
              </Text>
            </TouchableOpacity>

            {/* Expanded Details */}
            {expanded === item.id && (
              <View style={styles.expandedBox}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.sectionText}>
                  Static description goes here. No dynamic data added.
                </Text>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                  Compliance Mapping
                </Text>
                <Text style={styles.sectionText}>
                  No compliance mapping available
                </Text>
              </View>
            )}
          </View>
        ))
        }
      </ScrollView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    marginBottom: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 6,
  },

  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  td: {
    fontSize: 12,
    color: "#1F2937",
  },

  severityBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    width: 60,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  medium: { backgroundColor: "#FDE68A", color: "#92400E" },
  low: { backgroundColor: "#D1FAE5", color: "#065F46" },
  info: { backgroundColor: "#DBEAFE", color: "#1E3A8A" },

  endpoint: {
    width: "25%",
    fontSize: 11,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    color: "#111827",
  },

  expandedBox: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  sectionText: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 2,
  },
  infoImage: {
    height: 18,
    width: 18,
  },
});

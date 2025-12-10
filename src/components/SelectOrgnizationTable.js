import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, Image} from 'react-native';
import BreifCase from '../images/breifcase.png';

export default function SelectOrganizationTable({
  organizations = [],
  onSelect,
  processingOrg,
}) {
  const hasOrganizations = Array.isArray(organizations) && organizations.length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Select Organization</Text>
        <Text style={styles.subtitle}>Please select an organization to continue</Text>

        <View style={styles.tableWrapper}>
          {/* Header */}
          <View style={styles.tableRowHeader}>
            <Text style={styles.tableHeaderCell}>Organization Name</Text>
            <Text style={styles.tableHeaderCell}>Description</Text>
            <Text style={styles.tableHeaderCell}>Select</Text>
          </View>

          {/* Rows */}
          {hasOrganizations ? (
            organizations.map((org, index) => (
              <View key={`${org?.id || org?.name || index}`} style={styles.tableRow}>
                <Text style={styles.tableCell}>{org?.name || '—'}</Text>
                <Text style={styles.tableCell}>{org?.description || '—'}</Text>

                <TouchableOpacity
                  style={[
                    styles.selectBtn,
                    processingOrg === org?.name && styles.selectBtnDisabled,
                  ]}
                  disabled={!onSelect || processingOrg === org?.name}
                  onPress={() => onSelect?.(org)}
                >
                  <Image
                    source={BreifCase}
                    style={{width: 16, height: 16, marginLeft: 6, opacity: processingOrg === org?.name ? 0.6 : 1}}
                  />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No organizations found.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingTop: 40,
        alignItems: 'center',
    },

    card: {
        width: '95%',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
        elevation: 3,
    },

    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 6,
        color: '#111827',
    },

    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
    },

    // ---------------- TABLE ----------------
    tableWrapper: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        overflow: 'hidden',
    },

    tableRowHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        paddingVertical: 12,
    },

    tableHeaderCell: {
        flex: 1,
        fontWeight: '600',
        fontSize: 13,
        textAlign: 'center',
        color: '#111827',
    },

    tableRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderColor: '#e5e7eb',
        paddingVertical: 12,
        alignItems: 'center',
    },

    tableCell: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        color: '#374151',
    },

    selectBtn: {
        flex: 1,
        alignItems: 'center',
    },

    selectText: {
        color: '#2563eb',
        fontWeight: '600',
    },
  emptyRow: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectBtnDisabled: {
    opacity: 0.6,
  },
});

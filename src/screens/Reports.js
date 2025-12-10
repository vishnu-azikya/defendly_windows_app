import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Navbar from "./common/Navbar";
import Sidebar from "./common/sidebar";

const Reports = ({ onNavigate, currentRoute }) => {
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
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Reports</Text>
                            <Text style={styles.subtitle}>
                                View and manage your security assessment reports
                            </Text>
                        </View>

                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No Reports Available</Text>
                            <Text style={styles.emptySubtitle}>
                                Your security assessment reports will appear here.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </View>
    );
};

export default Reports;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F1F8FD",
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
        width: 70,
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
    scrollContent: {
        paddingBottom: 48,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "#6B7280",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
});


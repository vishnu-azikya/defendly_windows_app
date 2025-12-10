import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Linking,
    ScrollView,
    Image,
    StyleSheet,
} from "react-native";
// import { Wifi, RefreshCw, ExternalLink, Clock } from "lucide-react-native";
import Link from "../images/link.png";
import Reload from "../images/reload.png";
export default function LatestSecurityNews() {
    const [newsItems, setNewsItems] = useState([]);
    const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(180);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setNewsItems([
            {
                id: 1,
                title: "CISA Releases Security Advisory for Critical Infrastructure",
                description:
                    "The Cybersecurity and Infrastructure Security Agency has issued new guidance...",
                url: "https://www.cisa.gov",
                source: "CISA",
                publishedAt: "2h ago",
                category: "critical",
                severity: "critical",
                attachments: [{ name: "CISA_Advisory.pdf" }],
            },
            {
                id: 2,
                title: "Latest Cybersecurity Threats and Vulnerabilities",
                description:
                    "Comprehensive coverage of the latest security threats, data breaches...",
                url: "https://www.bleepingcomputer.com",
                source: "Bleeping Computer",
                publishedAt: "4h ago",
                category: "warning",
                severity: "high",
                attachments: [{ name: "Threat_Report.pdf" }],
            },
        ]);
    }, []);

    const getCategoryColor = (category) => {
        switch (category) {
            case "critical":
                return styles.catCritical;
            case "warning":
                return styles.catWarning;
            case "info":
                return styles.catInfo;
            default:
                return styles.catDefault;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case "critical":
                return styles.sevCritical;
            case "high":
                return styles.sevHigh;
            case "medium":
                return styles.sevMedium;
            default:
                return styles.sevLow;
        }
    };

    const openURL = (url) => {
        if (url) Linking.openURL(url);
    };

    return (
        <View style={styles.card}>
            {/* HEADER */}
            <View style={styles.headerRow}>
                <View>
                    <View style={styles.titleRow}>
                        <Text style={styles.heading}>Latest Security News</Text>

                        <View style={styles.liveRow}>
                            {/* <Wifi size={16} color="#22c55e" /> */}
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>

                    <View style={styles.subRow}>
                        <Text style={styles.subText}>
                            Real-time cybersecurity threats and updates
                        </Text>

                        <View style={styles.countdownRow}>
                            {/* <Clock size={12} color="#a3a3a3" /> */}
                            <Text style={styles.countdownText}>
                                Next update: {Math.floor(autoRefreshCountdown / 60)}:
                                {(autoRefreshCountdown % 60).toString().padStart(2, "0")}
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={() => console.log("Refreshing...")}
                >
                    <Image source={Reload} style={{ width: 16, height: 16 }} />
                    {/* <RefreshCw size={18} color="#444" /> */}
                </TouchableOpacity>
            </View>

            {/* NEWS LIST */}
            <ScrollView style={styles.list}>
                {newsItems.map((item, index) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.newsItem}
                        onPress={() => openURL(item.url)}
                    >
                        {/* Category Circle */}
                        <View style={[styles.iconCircle, getCategoryColor(item.category)]}>
                            <Text style={styles.iconText}>
                                {item.category === "critical" ? "!" : "i"}
                            </Text>
                        </View>

                        <View style={styles.content}>
                            {/* Title + External link */}
                            <View style={styles.titleWrap}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.newsTitle}>{item.title}</Text>
                                    <Text style={styles.newsDesc}>{item.description}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.linkButton}
                                    onPress={() => openURL(item.url)}
                                >
                                    <Image source={Link} style={{ width: 14, height: 14 }} />
                                    {/* <ExternalLink size={14} color="#777" /> */}
                                </TouchableOpacity>
                            </View>

                            {/* Attachments */}
                            {item.attachments?.length > 0 && (
                                <View style={styles.attachRow}>
                                    {item.attachments.slice(0, 2).map((a, i) => (
                                        <Text key={i} style={styles.attachText}>
                                            📎 {a.name}
                                        </Text>
                                    ))}
                                </View>
                            )}

                            {/* Meta Row */}
                            <View style={styles.metaRow}>
                                <View style={styles.metaLeft}>
                                    <Text style={styles.metaText}>{item.source}</Text>
                                    <Text style={styles.metaDot}>•</Text>
                                    <Text style={styles.metaText}>{item.publishedAt}</Text>
                                    <Text style={styles.metaDot}>•</Text>
                                    <Text style={styles.readMore}>Read more</Text>
                                </View>

                                <Text style={[styles.severity, getSeverityColor(item.severity)]}>
                                    {item.severity.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

/* ---------------------------------------------------------
 * STYLESHEET
 * --------------------------------------------------------- */
const styles = StyleSheet.create({
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        padding: 16,
    },

    /* HEADER */
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },

    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },

    heading: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },

    liveRow: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 6,
    },

    liveText: {
        fontSize: 12,
        color: "#22c55e",
        marginLeft: 2,
        fontWeight: "600",
    },

    subRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
    },

    subText: {
        fontSize: 13,
        color: "#6b7280",
        marginRight: 10,
    },

    countdownRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    countdownText: {
        fontSize: 12,
        color: "#9ca3af",
        marginLeft: 2,
    },

    refreshBtn: {
        padding: 6,
        borderWidth: 1,
        borderRadius: 8,
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        borderColor: "#d1d5db",
    },

    /* LIST */
    list: {
        marginTop: 10,
    },

    newsItem: {
        flexDirection: "row",
        padding: 12,
        backgroundColor: "#f9fafb",
        marginBottom: 10,
        borderRadius: 10,
    },

    /* Category Icon */
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },

    iconText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },

    catCritical: { backgroundColor: "#dc2626" },
    catWarning: { backgroundColor: "#f59e0b" },
    catInfo: { backgroundColor: "#2563eb" },
    catDefault: { backgroundColor: "#6b7280" },

    /* Content */
    content: {
        flex: 1,
    },

    titleWrap: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    newsTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
    },

    newsDesc: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 4,
    },

    linkButton: {
        padding: 5,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 6,
        height: 26,
        width: 26,
        alignItems: "center",
        justifyContent: "center",
    },

    /* Attachments */
    attachRow: {
        flexDirection: "row",
        marginTop: 6,
    },

    attachText: {
        fontSize: 11,
        color: "#6b7280",
        marginRight: 8,
    },

    /* Meta Row */
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        alignItems: "center",
    },

    metaLeft: {
        flexDirection: "row",
        alignItems: "center",
    },

    metaText: {
        fontSize: 12,
        color: "#6b7280",
    },

    metaDot: {
        fontSize: 12,
        marginHorizontal: 4,
        color: "#9ca3af",
    },

    readMore: {
        fontSize: 12,
        color: "#3b82f6",
        fontWeight: "600",
    },

    severity: {
        fontSize: 12,
        fontWeight: "700",
    },

    sevCritical: { color: "#dc2626" },
    sevHigh: { color: "#d97706" },
    sevMedium: { color: "#f59e0b" },
    sevLow: { color: "#6b7280" },
});

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import info from '../images/info.png';
import TopVulnerabilities from './TopVulnerabilities';
import LatestSecurityNews from './LatestSecurityNews';

export default function DashboardScreen() {
    const score = 75; // static
    const riskText = "Moderate Risk - Action Needed";
    return (
        <View style={styles.screen}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Cyber Risk Posture</Text>
                        <Text style={styles.subtitle}>
                            Executive-level insights into vulnerabilities, threats, and performance.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.button}>
                        <Text style={styles.buttonText}>Download</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Two Columns */}
                <View style={styles.mainGrid}>

                    {/* LEFT COLUMN */}
                    <View style={styles.column}>
                        <View style={styles.card}>
                            <View style={styles.cardInner}>
                                {/* LEFT SECTION */}
                                <View style={styles.leftArea}>
                                    <View style={[{ marginBottom: 20 }]}>
                                        <View style={styles.headingRow}>
                                            <Text style={styles.heading}>Cyber Hygiene Score</Text>
                                            <Image source={info} style={styles.infoImage} />
                                        </View>

                                        <Text style={styles.subText}>
                                            Reflects your target's overall security posture. Aim for a higher score.
                                        </Text>
                                    </View>
                                    <View style={[{ marginBottom: 30 }]}>
                                        <TouchableOpacity style={styles.improveBtn}>
                                            <Text style={styles.improveBtnText}>Improve Score</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* RIGHT SECTION */}
                                <View style={styles.rightArea}>

                                    {/* Circle Placeholder */}
                                    <View style={styles.circle}>
                                        <Text style={styles.circleText}>{score}</Text>
                                    </View>

                                    {/* Risk Level */}
                                    <Text style={styles.riskText}>{riskText}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.card}>
                            <View style={[styles.cardInner, { alignItems: "flex-start", flexDirection: "column" }]}>
                                <View style={[styles.headingRow, { marginBottom: 0 }]}>
                                    <Text style={[styles.heading, { fontSize: 18 }]}>Risk Trends Over Time</Text>
                                    <Image source={info} style={styles.infoImage} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                    <View style={[{ flexDirection: 'row', gap: 12 }]}>
                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, backgroundColor: '#B91C1C', borderRadius: 8 }}></View>
                                            <Text style={{ fontSize: 12 }}>0 Critical</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 8 }}></View>
                                            <Text style={{ fontSize: 12 }}>0 High</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, backgroundColor: '#F97316', borderRadius: 8 }}></View>
                                            <Text style={{ fontSize: 12 }}>1 Low</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, backgroundColor: '#22C55E', borderRadius: 8 }}></View>
                                            <Text style={{ fontSize: 12 }}>1 Info</Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                                        <TouchableOpacity style={[styles.Sbutton, styles.SbuttonActive]}>
                                            <Text style={[styles.SbuttonText, styles.SbuttonTextActive]}>Monthly</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.Sbutton}>
                                            <Text style={styles.SbuttonText}>Weekly</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.Sbutton}>
                                            <Text style={styles.SbuttonText}>Today</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.innerGrid}>
                            <View style={[styles.box, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, padding: 0 }]}>
                                <View style={styles.card}>
                                    <View style={[styles.cardInner, { alignItems: "flex-start", flexDirection: "column" }]}>
                                        <View style={[styles.headingRow, { marginBottom: 0 }]}>
                                            <Text style={[styles.heading, { fontSize: 18 }]}>Asset Risk by Severity</Text>
                                            <Image source={info} style={styles.infoImage} />
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={[styles.box, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, padding: 0 }]}>

                                <View style={styles.card}>
                                    <View style={[styles.cardInner, { alignItems: "flex-start", flexDirection: "column" }]}>
                                        <View style={[styles.headingRow, { marginBottom: 0 }]}>
                                            <Text style={[styles.heading, { fontSize: 18 }]}>Threat Intelligence Score</Text>
                                            <Image source={info} style={styles.infoImage} />
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <TopVulnerabilities />
                        <LatestSecurityNews />
                    </View>

                    {/* RIGHT COLUMN */}
                    <View style={styles.column}>
                        <View style={styles.box}><Text>asd</Text></View>

                        <View style={styles.innerGrid}>
                            <View style={styles.box}><Text>asd</Text></View>
                            <View style={styles.box}><Text>asd</Text></View>
                        </View>

                        <View style={styles.box}><Text>asd</Text></View>
                    </View>

                </View>

            </ScrollView>
        </View>
    );
}
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F1F8FD',
    },

    container: {
        padding: 16,
        paddingBottom: 48,
    },

    /* Header */
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },

    headerLeft: {
        flexShrink: 1,
        paddingRight: 10,
    },
    infoImage: {
        height: 18,
        width: 18,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1f1f1f",
    },

    subtitle: {
        marginTop: 4,
        fontSize: 14,
        color: "#666",
    },

    /* Download button */
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: "#00457F",
        borderRadius: 6,
        justifyContent: "center",
        height: 40,
    },

    buttonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },

    /* Main Grid */
    mainGrid: {
        flexDirection: "row",
        width: "100%",
        gap: 20,
    },

    column: {
        flex: 1,
        flexDirection: "column",
        gap: 20,
    },

    innerGrid: {
        flexDirection: "row",
        gap: 16,
    },

    box: {
        flex: 1,
        padding: 20,
        backgroundColor: "#ffffff",
        borderRadius: 8,
        elevation: 2,             // shadow for Android
        shadowColor: "#000",      // shadow for iOS
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },

    card: {
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e5e5",
        overflow: "hidden",
    },

    cardInner: {
        flexDirection: "row",
        padding: 20,
        gap: 20,
        justifyContent: "space-between",
        alignItems: "center",
    },

    /* LEFT SIDE */
    leftArea: {
        flex: 1,
        justifyContent: "space-between",
        flexDirection: "column",
    },

    headingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 6,
        marginBottom: 8,
    },

    heading: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111",
    },

    infoDot: {
        width: 10,
        height: 10,
        borderRadius: 10,
        backgroundColor: "#999",
    },

    subText: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
        maxWidth: 300,
        marginBottom: 20,
    },

    improveBtn: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#d1d1d1",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        alignSelf: "flex-start",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },

    improveBtnText: {
        fontSize: 14,
        color: "#111",
        fontWeight: "600",
    },

    /* RIGHT SIDE */
    rightArea: {
        width: 130,
        alignItems: "center",
    },

    circle: {
        width: 130,
        height: 130,
        borderRadius: 100,
        backgroundColor: "#F1F1F1",
        borderWidth: 14,
        borderColor: "#E0E0E0",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },

    circleText: {
        fontSize: 40,
        fontWeight: "700",
        color: "#111",
    },

    riskText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },
    Sbutton: {
        paddingVertical: 4,       // py-1
        paddingHorizontal: 12,    // px-3
        backgroundColor: '#e2e8f0', // example background
        borderRadius: 6,          // optional for rounded corners
        alignItems: 'center',
        justifyContent: 'center',
    },
    SbuttonActive: {
        backgroundColor: '#00457f',
    },
    SbuttonText: {
        color: '#000',         // text-white
        fontWeight: '600',        // font-semibold
        fontSize: 12,             // text-xs
    },
    SbuttonTextActive: {
        color: '#FFFFFF'        // text-xs
    },
});

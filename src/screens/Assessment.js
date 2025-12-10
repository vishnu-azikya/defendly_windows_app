import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Navbar from "./common/Navbar";
import Sidebar from "./common/sidebar";
import AssessmentCenter from "../components/AssessmentCenter";
import ScanModal from "../modal/scanModal";

const Assessment = ({ onNavigate, currentRoute }) => {
    return (
        <>
            <View style={styles.container}>
                <View style={styles.navbarWrapper}>
                    <Navbar />
                </View>

                <View style={styles.bodyWrapper}>
                    <View style={styles.sidebarWrapper}>
                        <Sidebar onNavigate={onNavigate} currentRoute={currentRoute} />
                    </View>
                    <View style={styles.contentWrapper}>
                        <AssessmentCenter onNavigate={onNavigate} />
                    </View>
                </View>

            </View>
            <ScanModal visible={false} onClose={() => { }} />
        </>
    );
};

export default Assessment;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F1F8FD", // light mode
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
        width: 70, // collapsed width similar to web code
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
});

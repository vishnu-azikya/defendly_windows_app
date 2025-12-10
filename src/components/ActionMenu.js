// ActionMenu.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const ActionMenu = React.forwardRef(({ onPress }, ref) => {
    return (
        <View style={styles.wrapper}>
            <TouchableOpacity
                ref={ref}
                style={styles.actionBtn}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={styles.actionText}>⋯</Text>
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        position: "relative",
    },
    actionBtn: {
        padding: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    actionText: {
        fontSize: 18,
        color: "#6B7280",
    },
});

export default ActionMenu;

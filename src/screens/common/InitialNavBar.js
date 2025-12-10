import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    useColorScheme,
    Pressable,
} from "react-native";
import logoFUll from '../../images/logoFull.png';
import useAuth from '../../hooks/useAuth';

const InitialNavBar = () => {
    const isDark = useColorScheme() === "dark";
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const {logout} = useAuth();

    const handleLogout = async () => {
        setShowProfileMenu(false);
        try {
            await logout();
        } catch (error) {
            console.log('Logout failed', error);
        }
    };

    return (
        <View
            style={[
                styles.navbar,
                { backgroundColor: isDark ? "#202020" : "#ffffff" },
            ]}
        >
            {/* Logo */}
            <View style={styles.left}>
                <Image
                    source={logoFUll} // use PNG or JPG
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Right Section */}
            <View style={styles.right}>
                <Pressable
                    onPress={() => setShowProfileMenu(!showProfileMenu)}
                    style={[
                        styles.profileButton,
                        { backgroundColor: isDark ? "#2e2e2e" : "#f3f3f3" },
                    ]}
                >
                    <Text style={{ color: isDark ? "white" : "black" }}>👤</Text>
                </Pressable>

                {showProfileMenu && (
                    <View
                        style={[
                            styles.dropdown,
                            { backgroundColor: isDark ? "#111" : "#fff" },
                        ]}
                    >
                        <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                            <Text style={{ color: isDark ? "#fff" : "#000" }}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        height: 65,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        zIndex: 100,
    },
    left: {
        flexDirection: "row",
        alignItems: "center",
    },
    logo: {
        height: 40,
        width: 140,
    },
    right: {
        marginLeft: "auto",
        position: "relative",
    },
    profileButton: {
        padding: 10,
        borderRadius: 50,
    },
    dropdown: {
        position: "absolute",
        top: 55,
        right: 0,
        width: 150,
        borderRadius: 10,
        paddingVertical: 8,
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    dropdownItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
});

export default InitialNavBar;

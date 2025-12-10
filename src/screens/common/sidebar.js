import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  StyleSheet,
} from "react-native";

const Sidebar = ({ onNavigate, currentRoute = "" }) => {
  const [expanded, setExpanded] = useState(false);

  const widthAnim = useState(new Animated.Value(70))[0]; // collapsed width
  const expandedWidth = 240;

  const expandSidebar = () => {
    Animated.timing(widthAnim, {
      toValue: expandedWidth,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setExpanded(true);
  };

  const collapseSidebar = () => {
    Animated.timing(widthAnim, {
      toValue: 70,
      duration: 200,
      useNativeDriver: false,
    }).start();
    setExpanded(false);
  };

  const menuItems = [
    { label: "Dashboard", path: "Dashboard", icon: require("../../images/home.png") },
    { label: "Assessment Center", path: "Assessment", icon: require("../../images/assesment.png") },
    // { label: "Assets Inventory", path: "Assets", icon: require("../../images/assesmentInventory.png") },
    // { label: "Vulnerability Hub", path: "Vulnerability", icon: require("../../images/hub.png") },
    // { label: "Reports", path: "Reports", icon: require("../../images/report.png") },
    // { label: "Settings", path: "Settings", icon: require("../../images/setting.png") },
  ];


  const documentationItem = {
    label: "Documentation",
    path: "Documentation",
    icon: require("../../images/documentation.png"),
  };

  const handleNavigate = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
    } else {
      console.warn("Sidebar: onNavigate handler missing");
    }
  };

  return (
    <Animated.View
      style={[styles.sidebar, { width: widthAnim }]}
      onMouseEnter={expandSidebar}
      onMouseLeave={collapseSidebar}
    >
      {/* Top Menu */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <MenuItem
            key={index}
            item={item}
            active={currentRoute === item.path}
            expanded={expanded}
            onPress={() => handleNavigate(item.path)}
          />
        ))}
      </View>

      {/* Bottom Documentation Item */}
      <View style={styles.bottomSection}>
        <MenuItem
          item={documentationItem}
          active={currentRoute === documentationItem.path}
          expanded={expanded}
          onPress={() => handleNavigate(documentationItem.path)}
        />
      </View>
    </Animated.View>
  );
};

/* -------------------------------
   Reusable Menu Item Component
-------------------------------- */
const MenuItem = ({ item, active, expanded, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.item, active && styles.activeItem]}
  >
    <View style={[styles.iconBox, active && styles.activeIcon]}>
      <Image
        source={item.icon}
        style={[
          styles.iconImage,
          { tintColor: active ? "#fff" : "#555" }
        ]}
        resizeMode="contain"
      />
    </View>

    {expanded && (
      <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1}>
        {item.label}
      </Text>
    )}
  </TouchableOpacity>
);

/* -------------------------------
   Styles
-------------------------------- */
const styles = StyleSheet.create({
  iconImage: {
    width: 20,
    height: 20,
  },
  sidebar: {
    backgroundColor: "#ffffff",
    borderRightWidth: 0,
    height: "100%",
    paddingTop: 20,
    paddingHorizontal: 10,
  },

  menuContainer: {
    marginTop: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
  },

  activeItem: {
    backgroundColor: "#00457f",
  },

  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eef2f5",
  },

  activeIcon: {
    backgroundColor: "#003866",
  },

  label: {
    marginLeft: 12,
    fontSize: 15,
    color: "#444",
    fontWeight: "500",
  },

  activeLabel: {
    color: "#fff",
  },

  bottomSection: {
    marginTop: "auto",
    paddingBottom: 30,
    paddingHorizontal: 0,
  },
});

export default Sidebar;

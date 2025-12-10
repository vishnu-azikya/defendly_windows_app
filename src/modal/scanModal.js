import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Switch,
    Dimensions,
    Alert,
    ActivityIndicator,
} from "react-native";
import useOrganization from '../hooks/useOrganization';
import { extractDomain } from '../services/scanService';

export default function ScanModal({ visible, onClose, onSubmit }) {
    const { currentOrganization, organizations } = useOrganization();
    const [authScan, setAuthScan] = useState(false);
    const [scanTargets, setScanTargets] = useState([]);
    const [currentTarget, setCurrentTarget] = useState("");
    const [urlError, setUrlError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scanFormData, setScanFormData] = useState({
        organization: "",
        projectName: "",
        targetAsset: "web",
        scanTarget: "",
        scanTargets: [],
        label: "",
        schedule: "now",
        scheduledDate: "",
        scheduledTime: "",
        recurrence: "none",
        disclaimer: false,
        email: "",
        password: "",
        loginUrl: "",
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(10)).current;

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            resetForm();
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0.45,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(10);
        }
    }, [visible]);

    // Set organization when available
    useEffect(() => {
        const activeOrg = currentOrganization || organizations?.[0];
        if (activeOrg?.name) {
            setScanFormData(prev => ({
                ...prev,
                organization: activeOrg.name
            }));
        }
    }, [currentOrganization, organizations]);

    if (!visible) return null;

    const resetForm = () => {
        const activeOrg = currentOrganization || organizations?.[0];
        setScanFormData({
            organization: activeOrg?.name || "",
            projectName: "",
            targetAsset: "web",
            scanTarget: "",
            scanTargets: [],
            label: "",
            schedule: "now",
            scheduledDate: "",
            scheduledTime: "",
            recurrence: "none",
            disclaimer: false,
            email: "",
            password: "",
            loginUrl: "",
        });
        setScanTargets([]);
        setCurrentTarget("");
        setUrlError("");
        setAuthScan(false);
        setIsSubmitting(false);
    };

    const validateURL = (url) => {
        return url.startsWith('http://') || url.startsWith('https://');
    };

    const addTarget = () => {
        const trimmedTarget = currentTarget.trim();
        if (!trimmedTarget) return;

        if (!validateURL(trimmedTarget)) {
            setUrlError('URL must start with http:// or https://');
            return;
        }

        if (scanTargets.includes(trimmedTarget)) {
            setUrlError('This URL has already been added');
            return;
        }

        // If auth scan is on, replace existing URL instead of adding
        if (authScan) {
            setScanTargets([trimmedTarget]);
            setScanFormData(prev => ({
                ...prev,
                scanTarget: trimmedTarget,
                scanTargets: [trimmedTarget]
            }));
        } else {
            const newTargets = [...scanTargets, trimmedTarget];
            setScanTargets(newTargets);
            setScanFormData(prev => ({
                ...prev,
                scanTarget: scanTargets.length === 0 ? trimmedTarget : prev.scanTarget,
                scanTargets: newTargets
            }));
        }

        setCurrentTarget("");
        setUrlError("");
    };

    const removeTarget = (index) => {
        const updatedTargets = scanTargets.filter((_, i) => i !== index);
        setScanTargets(updatedTargets);
        setScanFormData(prev => ({
            ...prev,
            scanTarget: updatedTargets.length > 0 ? updatedTargets[0] : "",
            scanTargets: updatedTargets
        }));
        setUrlError("");
    };

    const handleTargetInputChange = (value) => {
        // If auth scan is on, don't allow adding multiple URLs
        if (authScan && (value.endsWith(',') || value.endsWith(' '))) {
            return; // Block multiple URL input when auth scan is on
        }

        if (value.endsWith(',') || value.endsWith(' ')) {
            const urlToAdd = value.slice(0, -1).trim();
            if (urlToAdd) {
                setCurrentTarget(urlToAdd);
                addTarget();
                return;
            }
        }

        setCurrentTarget(value);
        setUrlError("");
    };

    const handleSubmit = async () => {
        // Validation
        if (scanTargets.length === 0 && !currentTarget.trim()) {
            setUrlError('Please add at least one scan target');
            return;
        }

        if (currentTarget.trim() && !scanTargets.includes(currentTarget.trim())) {
            addTarget();
            return;
        }

        if (!scanFormData.disclaimer) {
            Alert.alert('Disclaimer Required', 'Please accept the disclaimer to continue.');
            return;
        }

        if (authScan) {
            if (!scanFormData.email || !scanFormData.password || !scanFormData.loginUrl) {
                Alert.alert('Auth Scan Required Fields', 'Please fill in all authentication fields.');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Prepare form data
            const formData = {
                ...scanFormData,
                scanTargets: scanTargets,
                scanTarget: scanTargets[0] || scanFormData.scanTarget,
                projectName: scanFormData.projectName || extractDomain(scanTargets[0] || scanFormData.scanTarget)
            };

            console.log('Submitting scan form data:', formData);

            // Call the onSubmit callback
            if (onSubmit) {
                await onSubmit(formData);
            }

            // Close modal on success
            onClose();
        } catch (error) {
            console.error('Error submitting scan form:', error);
            Alert.alert('Scan Initiation Failed', error.message || 'Failed to start scan. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* BACKDROP */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

            {/* MODAL BOX */}
            <Animated.View style={[styles.modal, { transform: [{ translateY: slideAnim }] }]}>

                {/* HEADER */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Start AI-Powered Scan</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ fontSize: 22 }}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: "100%" }}>
                    {/* 3-COLUMN ROW */}
                    <View style={styles.row3}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Organization Name</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={scanFormData.organization.toUpperCase()}
                                editable={false}
                            />
                        </View>

                        <View style={styles.column}>
                            <Text style={styles.label}>Target Name</Text>
                            <TextInput
                                placeholder="Enter Target Name"
                                style={styles.input}
                                value={scanFormData.projectName}
                                onChangeText={(t) =>
                                    setScanFormData({ ...scanFormData, projectName: t })
                                }
                            />
                        </View>

                        <View style={styles.column}>
                            <Text style={styles.label}>Auth Scan?</Text>
                            <Switch
                                value={authScan}
                                onValueChange={(value) => {
                                    setAuthScan(value);
                                    if (value) {
                                        // When enabling auth scan, keep only first URL
                                        if (scanTargets.length > 1) {
                                            const firstUrl = scanTargets[0];
                                            setScanTargets([firstUrl]);
                                            setScanFormData(prev => ({
                                                ...prev,
                                                scanTarget: firstUrl,
                                                scanTargets: [firstUrl]
                                            }));
                                        }
                                    }
                                }}
                            />
                        </View>
                    </View>

                    {/* SCAN TARGETS */}
                    <Text style={styles.label}>Scan Targets</Text>

                    <View style={[styles.targetsBox, urlError ? styles.errorBorder : null]}>
                        {scanTargets.map((target, index) => {
                            const displayUrl = target.replace(/^https?:\/\//, '');
                            return (
                                <View style={styles.badge} key={index}>
                                    <Text style={{ color: "#fff", fontSize: 12 }}>
                                        {displayUrl.length > 25 ? displayUrl.substring(0, 25) + '...' : displayUrl}
                                    </Text>
                                    {index === 0 && (
                                        <Text style={styles.primaryBadge}>PRIMARY</Text>
                                    )}
                                    <TouchableOpacity onPress={() => removeTarget(index)}>
                                        <Text style={{ color: "#fff", marginLeft: 6 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        <TextInput
                            placeholder={authScan ?
                                (scanTargets.length === 0 ? "Enter single URL with http(s)://" : "Replace URL...") :
                                (scanTargets.length === 0 ? "Enter URL with http(s):// and press enter" : "Add another URL...")
                            }
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={currentTarget}
                            onChangeText={handleTargetInputChange}
                            onSubmitEditing={addTarget}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {urlError ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>⚠️ {urlError}</Text>
                        </View>
                    ) : null}

                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsText}>
                            💡 <Text style={styles.tipsBold}>Tips:</Text> {authScan ?
                                "Auth scan mode: Only single URL allowed. Enter your login-enabled target URL." :
                                "Type a URL and press enter, comma, or space to add multiple URLs. First URL becomes the primary target."
                            }
                        </Text>
                    </View>

                    {/* AUTH FIELDS */}
                    {authScan && (
                        <>
                            <View style={styles.row2}>
                                <View style={styles.column}>
                                    <Text style={styles.label}>Username or Email</Text>
                                    <TextInput
                                        placeholder="Enter email / username"
                                        style={styles.input}
                                        value={scanFormData.email}
                                        onChangeText={(t) =>
                                            setScanFormData({ ...scanFormData, email: t })
                                        }
                                    />
                                </View>

                                <View style={styles.column}>
                                    <Text style={styles.label}>Password</Text>
                                    <TextInput
                                        placeholder="Enter password"
                                        secureTextEntry
                                        style={styles.input}
                                        value={scanFormData.password}
                                        onChangeText={(t) =>
                                            setScanFormData({ ...scanFormData, password: t })
                                        }
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Login URL</Text>
                            <TextInput
                                placeholder="Enter login page URL"
                                style={styles.input}
                                value={scanFormData.loginUrl}
                                onChangeText={(t) =>
                                    setScanFormData({ ...scanFormData, loginUrl: t })
                                }
                            />
                        </>
                    )}

                    {/* LABEL */}
                    <Text style={[styles.label, { marginTop: 7 }]}>Label (optional)</Text>
                    <TextInput
                        placeholder="Add a label for the scan"
                        style={styles.input}
                        value={scanFormData.label}
                        onChangeText={(t) =>
                            setScanFormData({ ...scanFormData, label: t })
                        }
                    />

                    {/* SCHEDULE */}
                    <View style={[
                        styles.rowBetween,
                        {
                            flexDirection: "column",
                            alignItems: "flex-start",
                            marginTop: 7,
                        },
                    ]}>
                        <Text style={styles.label}>Schedule Later?</Text>
                        <Switch
                            value={scanFormData.schedule === "later"}
                            onValueChange={(v) =>
                                setScanFormData({ ...scanFormData, schedule: v ? "later" : "now" })
                            }
                        />
                    </View>

                    {/* DATE + TIME + REPEAT */}
                    {scanFormData.schedule === "later" && (
                        <View style={styles.row3}>
                            <View style={styles.column}>
                                <Text style={styles.label}>Date</Text>
                                <TextInput style={styles.input} value="11/25/2025" />
                            </View>

                            <View style={styles.column}>
                                <Text style={styles.label}>Time</Text>
                                <TextInput style={styles.input} value="11:22" />
                            </View>

                            <View style={styles.column}>
                                <Text style={styles.label}>Repeat</Text>
                                <TextInput style={styles.input} value="No Recurrence" />
                            </View>
                        </View>
                    )}

                    {/* DISCLAIMER */}
                    <View style={[styles.rowBetween, { marginTop: 16 }]}>
                        <Switch
                            value={scanFormData.disclaimer}
                            onValueChange={(v) =>
                                setScanFormData({ ...scanFormData, disclaimer: v })
                            }
                        />
                        <Text style={{ flex: 1, marginLeft: 0, marginTop: 6 }}>
                            I confirm that I own or have authorization to scan the specified assets and that the information provided is accurate.
                        </Text>
                    </View>

                    {/* SUBMIT */}
                    <TouchableOpacity
                        disabled={isSubmitting || !scanFormData.disclaimer || (scanTargets.length === 0 && !currentTarget.trim())}
                        style={[
                            styles.button,
                            {
                                opacity: isSubmitting || !scanFormData.disclaimer || (scanTargets.length === 0 && !currentTarget.trim()) ? 0.5 : 1,
                            },
                        ]}
                        onPress={handleSubmit}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {scanTargets.length > 1 ?
                                    `Start Scan with ${scanTargets.length} Targets` :
                                    scanTargets.length === 1 ?
                                        "Start Single Target Scan" :
                                        currentTarget.trim() ?
                                            "Add URL and Continue" :
                                            "Add at least one URL to continue"
                                }
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "#000",
    },
    modal: {
        position: "absolute",
        top: "10%",
        width: 540,
        alignSelf: "center",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
    },
    row3: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 20,
        marginVertical: 8,
    },
    row2: {
        flexDirection: "row",
        gap: 20,
        marginVertical: 8,
    },
    column: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: "500",
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 6,
        borderRadius: 6,
        marginBottom: 6,
        height: 33,
    },
    targetsBox: {
        borderWidth: 0,
        borderColor: "#ccc",
        padding: 0,
        borderRadius: 0,
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 0,
    },
    badge: {
        flexDirection: "row",
        backgroundColor: "#007bff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        margin: 3,
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    button: {
        backgroundColor: "#00457f",
        padding: 12,
        borderRadius: 6,
        alignItems: "center",
        marginTop: 20,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
    },
    disabledInput: {
        backgroundColor: "#f5f5f5",
        color: "#666",
    },
    errorBorder: {
        borderColor: "#ff4444",
        borderWidth: 1,
    },
    errorContainer: {
        backgroundColor: "#fff5f5",
        borderColor: "#ffcccc",
        borderWidth: 1,
        borderRadius: 6,
        padding: 8,
        marginTop: 4,
    },
    errorText: {
        color: "#cc0000",
        fontSize: 12,
    },
    tipsContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: "#f8f9fa",
        borderRadius: 6,
    },
    tipsText: {
        fontSize: 11,
        color: "#666",
        lineHeight: 16,
    },
    tipsBold: {
        fontWeight: "600",
    },
    primaryBadge: {
        fontSize: 8,
        backgroundColor: "#fff",
        color: "#007bff",
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 8,
        marginLeft: 4,
        fontWeight: "600",
    },
});

import { Alert, Platform, NativeModules } from 'react-native';
import { generateDetailedReportPDF } from './pdfGenerator';

// For Windows, react-native-fs is not properly supported
// We'll check the platform and only try to use it on non-Windows platforms
// On Windows, we'll use an alternative method
const getRNFS = () => {
    // On Windows, react-native-fs causes crashes, so skip it entirely
    if (Platform.OS === 'windows') {
        return null;
    }
    
    // For other platforms, try to require react-native-fs
    try {
        const RNFS = require('react-native-fs');
        // Verify it's actually working
        if (RNFS && typeof RNFS.DocumentDirectoryPath !== 'undefined') {
            return RNFS;
        }
    } catch (e) {
        // Module not available or not linked
        console.warn('react-native-fs not available:', e.message);
    }
    
    return null;
};

/**
 * Helper function to convert Uint8Array to base64
 */
const uint8ArrayToBase64 = (uint8Array) => {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    // Manual base64 encoding (works in all React Native environments)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < binary.length) {
        const a = binary.charCodeAt(i++);
        const b = i < binary.length ? binary.charCodeAt(i++) : 0;
        const c = i < binary.length ? binary.charCodeAt(i++) : 0;
        const bitmap = (a << 16) | (b << 8) | c;
        result += chars.charAt((bitmap >> 18) & 63);
        result += chars.charAt((bitmap >> 12) & 63);
        result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : '=';
        result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : '=';
    }
    return result;
};

/**
 * Windows-specific file save using Windows.Storage APIs through native module
 */
export const saveFileWindows = async (pdfBytes, fileName) => {
    debugger;
    try {
        // Convert PDF bytes to base64
        const base64String = uint8ArrayToBase64(pdfBytes);
        
        // Try to use native module for file saving
        try {
            const { FileSaveModule } = NativeModules;
            if (FileSaveModule && FileSaveModule.saveFile) {
                console.log('Using native FileSaveModule to save file...');
                const filePath = await FileSaveModule.saveFile(base64String, fileName);
                
                // Check if result is an error (prefixed with "ERROR:")
                if (filePath && filePath.startsWith('ERROR:')) {
                    const errorMsg = filePath.substring(6); // Remove "ERROR:" prefix
                    throw new Error(errorMsg);
                }
                
                if (filePath && !filePath.includes('Error')) {
                    console.log(`File saved successfully to: ${filePath}`);
                    return {
                        success: true,
                        fileName: fileName,
                        filePath: filePath,
                        size: pdfBytes.length,
                        method: 'native_module'
                    };
                } else {
                    throw new Error(filePath || 'Unknown error from native module');
                }
            }
        } catch (nativeError) {
            console.warn('Native module not available, using fallback:', nativeError.message);
        }
        
        // Fallback: Store in AsyncStorage if native module fails
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            if (AsyncStorage) {
                const key = `pdf_${Date.now()}_${fileName}`;
                await AsyncStorage.setItem(key, base64String);
                console.log(`PDF data stored temporarily with key: ${key}`);
                
                await AsyncStorage.setItem(`${key}_metadata`, JSON.stringify({
                    fileName: fileName,
                    size: pdfBytes.length,
                    timestamp: new Date().toISOString(),
                }));
            }
        } catch (storageError) {
            console.warn('Could not store PDF in AsyncStorage:', storageError);
        }
        
        throw new Error('Native file save module not available. PDF data stored temporarily in AsyncStorage.');
    } catch (error) {
        console.error('Windows file save error:', error);
        throw error;
    }
};

/**
 * Downloads a detailed report for a scan
 * Uses pdf-lib to generate PDFs compatible with React Native Windows
 * 
 * @param {Object} reportData - The scan data with details spread to top level
 * @param {string} fileName - The filename for the downloaded report
 * @param {Object} options - Optional report generation options (matching web version)
 */
export const downloadDetailedReport = async (reportData, fileName = 'Defendly_Detailed_Report.pdf', options = {}) => {
    try {
        console.log(`Preparing to download report for ${fileName}...`);
        console.log('Report data:', reportData);

        // Extract scan ID from reportData (matching web version logic)
        const scanId = reportData.id || reportData.scan_id || reportData._id;
        
        if (!scanId) {
            throw new Error('Scan ID not found in report data');
        }

        // Generate PDF bytes using pdf-lib
        console.log('Generating PDF...');
        const pdfBytes = await generateDetailedReportPDF(reportData, {
            ...options,
            generatedAt: options.generatedAt || new Date(),
            organizationName: options.organizationName || reportData.organization,
            targetName: options.targetName || reportData.project || reportData.targetName,
            targetUrl: options.targetUrl || reportData.asset || reportData.scanTarget,
        });

        console.log(`PDF generated successfully. Size: ${pdfBytes.length} bytes`);

        // Handle file saving based on platform and available libraries
        const fs = getRNFS();
        if (Platform.OS === 'windows' || !fs) {
            // Windows without react-native-fs - use alternative method
            const result = await saveFileWindows(pdfBytes, fileName);
            
            // Show success or error message based on result
            debugger;
            if (result.success && result.filePath) {
                Alert.alert(
                    'PDF Downloaded Successfully',
                    `Report has been saved successfully!\n\n` +
                    `File: ${fileName}\n` +
                    `Size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n` +
                    `Location: ${result.filePath}\n\n` +
                    `Scan ID: ${scanId}`,
                    [
                        { text: 'OK', style: 'default' },
                    ]
                );
            } else {
                Alert.alert(
                    'PDF Generated',
                    `PDF report has been generated!\n\n` +
                    `File: ${fileName}\n` +
                    `Size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n\n` +
                    `The PDF data has been prepared and stored temporarily.\n` +
                    `Check the console for details.\n\n` +
                    `Scan ID: ${scanId}`,
                    [
                        { text: 'OK', style: 'default' },
                    ]
                );
            }
            
            return result;
        } else if (fs) {
            // Use react-native-fs if available
            let filePath;
            try {
                if (Platform.OS === 'windows') {
                    const downloadsPath = fs.DownloadDirectoryPath || fs.DocumentDirectoryPath;
                    filePath = `${downloadsPath}/${fileName}`;
                } else {
                    filePath = `${fs.DocumentDirectoryPath}/${fileName}`;
                }
            } catch (e) {
                filePath = `${fs.DocumentDirectoryPath}/${fileName}`;
            }

            const base64String = uint8ArrayToBase64(pdfBytes);
            
            console.log(`Saving PDF to: ${filePath}`);
            await fs.writeFile(filePath, base64String, 'base64');

            console.log(`PDF saved successfully to: ${filePath}`);
            
            Alert.alert(
                'PDF Downloaded',
                `Report has been saved successfully!\n\n` +
                `File: ${fileName}\n` +
                `Location: ${filePath}\n\n` +
                `Scan ID: ${scanId}`,
                [
                    { text: 'OK', style: 'default' },
                ]
            );

            return filePath;
        } else {
            // Fallback for other platforms without react-native-fs
            throw new Error('File system access not available on this platform');
        }
        
    } catch (error) {
        console.error('Failed to generate or download the report:', error);
        Alert.alert(
            'Download Failed',
            `Sorry, the report could not be downloaded.\n\n${error.message || 'Please check the console for errors.'}`,
            [{ text: 'OK' }]
        );
        throw error;
    }
};

/**
 * Downloads PDF report from backend API and saves it
 * @param {string} scanId - The scan ID to download PDF for
 * @param {string} fileName - Optional filename (will be generated if not provided)
 */
export const downloadPdfReportFromApi = async (scanId, fileName = null) => {
    try {
        if (!scanId) {
            throw new Error('Scan ID is required');
        }

        console.log(`Downloading PDF report from API for scan: ${scanId}`);
        
        // Import scanService dynamically to avoid circular dependency
        const { downloadPdfReport } = require('../services/scanService');
        
        // Download PDF bytes from API
        const pdfBytes = await downloadPdfReport(scanId);
        
        // Generate filename if not provided
        if (!fileName) {
            fileName = `vulnerability-assessment-report-${scanId}.pdf`;
        }
        
        console.log(`PDF downloaded, saving file: ${fileName}`);
        
        // Handle file saving based on platform
        const fs = getRNFS();
        if (Platform.OS === 'windows' || !fs) {
            // Windows without react-native-fs - use alternative method
            const result = await saveFileWindows(pdfBytes, fileName);
            
            // Show success or error message based on result
            if (result.success && result.filePath) {
                Alert.alert(
                    'PDF Downloaded Successfully',
                    `Report has been saved successfully!\n\n` +
                    `File: ${fileName}\n` +
                    `Size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n` +
                    `Location: ${result.filePath}\n\n` +
                    `Scan ID: ${scanId}`,
                    [
                        { text: 'OK', style: 'default' },
                    ]
                );
            } else {
                Alert.alert(
                    'PDF Generated',
                    `PDF report has been generated!\n\n` +
                    `File: ${fileName}\n` +
                    `Size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n\n` +
                    `The PDF data has been prepared and stored temporarily.\n` +
                    `Check the console for details.\n\n` +
                    `Scan ID: ${scanId}`,
                    [
                        { text: 'OK', style: 'default' },
                    ]
                );
            }
            
            return result;
        } else if (fs) {
            // Use react-native-fs if available
            let filePath;
            try {
                if (Platform.OS === 'windows') {
                    const downloadsPath = fs.DownloadDirectoryPath || fs.DocumentDirectoryPath;
                    filePath = `${downloadsPath}/${fileName}`;
                } else {
                    filePath = `${fs.DocumentDirectoryPath}/${fileName}`;
                }
            } catch (e) {
                filePath = `${fs.DocumentDirectoryPath}/${fileName}`;
            }

            const base64String = uint8ArrayToBase64(pdfBytes);
            
            console.log(`Saving PDF to: ${filePath}`);
            await fs.writeFile(filePath, base64String, 'base64');

            console.log(`PDF saved successfully to: ${filePath}`);
            
            Alert.alert(
                'PDF Downloaded',
                `Report has been saved successfully!\n\n` +
                `File: ${fileName}\n` +
                `Location: ${filePath}\n\n` +
                `Scan ID: ${scanId}`,
                [
                    { text: 'OK', style: 'default' },
                ]
            );

            return filePath;
        } else {
            // Fallback for other platforms without react-native-fs
            throw new Error('File system access not available on this platform');
        }
        
    } catch (error) {
        console.error('Failed to download PDF report from API:', error);
        Alert.alert(
            'Download Failed',
            `Sorry, the report could not be downloaded.\n\n${error.message || 'Please check the console for errors.'}`,
            [{ text: 'OK' }]
        );
        throw error;
    }
};

export default downloadDetailedReport;

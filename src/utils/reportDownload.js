import { Alert } from 'react-native';

/**
 * Downloads a detailed report for a scan
 * NOTE: React Native Windows cannot use @react-pdf/renderer (web version's library)
 * because it requires Node.js modules that aren't available in React Native.
 * 
 * This function prepares the report data exactly like the web version,
 * but PDF generation requires a compatible library or backend service.
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

        // The web version does this:
        // const blob = await getDetailedReportBlob(reportData, options);
        // const url = URL.createObjectURL(blob);
        // const a = document.createElement("a");
        // a.href = url;
        // a.download = fileName;
        // document.body.appendChild(a);
        // a.click();
        // URL.revokeObjectURL(url);
        // a.remove();
        
        // For React Native Windows, @react-pdf/renderer is not compatible
        // because it requires Node.js modules (yoga-layout/load) that aren't available
        
        // Prepare report summary (matching web version's data structure)
        const reportSummary = {
            scanId: scanId,
            fileName: fileName,
            target: reportData.asset || reportData.scanTarget || 'N/A',
            project: reportData.project || reportData.targetName || 'N/A',
            organization: reportData.organization || 'N/A',
            status: reportData.status || 'N/A',
            vulnerabilities: reportData.vulnerabilities || 0,
            severity: reportData.severity || {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0,
            },
            scanStart: reportData.startDate || reportData.scanStart || 'N/A',
            scanEnd: reportData.endDate || reportData.scanEnd || 'N/A',
            // Include all metrics (matching web version)
            cyber_hygiene_score: reportData.cyber_hygiene_score,
            threat_intelligence: reportData.threat_intelligence,
            compliance_readiness: reportData.compliance_readiness,
            security_misconfigurations: reportData.security_misconfigurations,
            attack_surface_index: reportData.attack_surface_index,
            vendor_risk_rating: reportData.vendor_risk_rating,
            alerts: reportData.alerts || [],
            endpoints: reportData.endpoints,
        };

        console.log('Report data prepared (matching web version structure):', reportSummary);
        
        // Show informative message
        Alert.alert(
            'PDF Generation Limitation',
            `The web version generates PDFs client-side using @react-pdf/renderer, ` +
            `which is not compatible with React Native Windows.\n\n` +
            `Report data has been prepared successfully:\n` +
            `• Scan ID: ${scanId}\n` +
            `• Target: ${reportSummary.target}\n` +
            `• Vulnerabilities: ${reportSummary.vulnerabilities}\n` +
            `• File name: ${fileName}\n\n` +
            `To enable PDF downloads, you can:\n` +
            `1. Use a backend API endpoint to generate PDFs\n` +
            `2. Use a React Native-compatible PDF library\n` +
            `3. Export the data as JSON for external processing`,
            [
                { text: 'OK', style: 'default' },
            ]
        );
        
    } catch (error) {
        console.error('Failed to prepare report:', error);
        Alert.alert(
            'Error',
            `Failed to prepare report data.\n\n${error.message || 'Please check the console for errors.'}`,
            [{ text: 'OK' }]
        );
        throw error;
    }
};

export default downloadDetailedReport;

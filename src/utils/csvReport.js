import { Buffer } from 'buffer';
import { NativeModules, Platform, Alert } from 'react-native';
// Lightweight CSV utilities for vulnerability findings export

// Strip HTML tags and common entities
export const stripHtmlTags = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") return "";
  let cleanString = htmlString.replace(/<[^>]*>/g, "");
  cleanString = cleanString.replace(/&nbsp;/g, " ");
  return cleanString.trim();
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    if (Array.isArray(value)) {
      const stringValue = String(value);
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }
    return escapeCsvValue(JSON.stringify(value));
  }

  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const arrayToCsv = (data, headers) => {
  const delimiter = ",";
  if (!data || data.length === 0) {
    return headers.map(escapeCsvValue).join(delimiter) + "\n";
  }
  const csvHeaders = headers.map(escapeCsvValue).join(delimiter);
  const csvRows = data.map((row) =>
    headers.map((header) => escapeCsvValue(row[header] || "")).join(delimiter)
  );
  return [csvHeaders, ...csvRows].join("\n");
};

const getThreatLevel = (alert) => {
  const severityRaw =
    alert.severity ||
    alert.risk ||
    alert.riskdesc ||
    alert.threat_level ||
    "low";
  const severity = String(severityRaw).toLowerCase().trim();
  if (severity.includes("crit") || severity === "critical") return "Critical";
  if (severity.includes("high") || severity === "high") return "High";
  if (severity.includes("med") || severity.includes("moder") || severity === "medium")
    return "Medium";
  if (severity.includes("info") || severity === "info" || severity === "informational")
    return "Informational";
  return "Low";
};

const formatDateForCsv = (date) => {
  if (!date) return "";
  try {
    const dateObj = new Date(date);
    return dateObj.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return String(date);
  }
};

// Simplified Vulnerability CSV
const generateSimplifiedVulnerabilitiesCsv = (alerts = []) => {
  const PLACEHOLDERS = {
    CWE_ID: "N/A",
    DESCRIPTION: "None Provided",
    SOLUTION: "Manual Remediation Required",
    REFERENCE: "No External Links",
    EVIDENCE: "N/A",
  };

  const vulnerabilities = alerts.map((alert, index) => {
    const threatLevel = getThreatLevel(alert);

    // References handling
    let referencesContent = "";
    const rawReference = alert.reference;
    let referencesToJoin = [];

    if (Array.isArray(rawReference)) {
      referencesToJoin = rawReference;
    } else if (typeof rawReference === "string" && rawReference.trim().length > 0) {
      const parts = rawReference.split(/(?=(https?:\/\/))/g);
      referencesToJoin = parts.filter((s) => s && s.trim().length > 0);
      if (referencesToJoin.length === 1 && referencesToJoin[0] === rawReference) {
        referencesToJoin = [rawReference];
      }
    }

    if (referencesToJoin.length > 0) {
      const cleanReferences = referencesToJoin
        .map((ref) => stripHtmlTags(ref))
        .filter((ref) => !/^https?:\/\/\s*$/i.test(ref.trim()))
        .filter((ref) => ref.trim().length > 0);
      if (cleanReferences.length > 0) {
        referencesContent = cleanReferences.join(", ");
      }
    }
    if (!referencesContent) referencesContent = PLACEHOLDERS.REFERENCE;

    // Evidence handling
    let evidenceContent = "";
    const instances = alert.instances;
    if (Array.isArray(instances)) {
      const evidenceItems = instances
        .map((instance) => instance?.evidence?.trim())
        .filter((text) => typeof text === "string" && text.length > 0)
        .map((text) => stripHtmlTags(text))
        .filter((text) => text && text.trim().length > 0);
      if (evidenceItems.length > 0) {
        const uniqueItems = [...new Set(evidenceItems)];
        evidenceContent = uniqueItems.join("\n");
      }
    }
    if (!evidenceContent && alert.evidence && String(alert.evidence).trim()) {
      const cleanEvidence = stripHtmlTags(String(alert.evidence).trim());
      if (cleanEvidence) evidenceContent = cleanEvidence;
    }
    if (evidenceContent.length > 0) {
      evidenceContent = evidenceContent.replace(/—|â€”/g, "").trim();
    }
    if (!evidenceContent) evidenceContent = PLACEHOLDERS.EVIDENCE;

    return {
      "S.No.": String(index + 1),
      "Name of Vulenerabilty": stripHtmlTags(
        alert.name || alert.alert || `Alert #${index + 1}`
      ),
      Severity: threatLevel,
      "CWE Id":
        stripHtmlTags(alert.cwe_id || alert.cweid || "") || PLACEHOLDERS.CWE_ID,
      Description:
        stripHtmlTags(alert.description || alert.desc || "") ||
        PLACEHOLDERS.DESCRIPTION,
      Evidence: evidenceContent,
      Solution: stripHtmlTags(alert.solution || "") || PLACEHOLDERS.SOLUTION,
      Reference: referencesContent,
    };
  });

  const headers = [
    "S.No.",
    "Name of Vulenerabilty",
    "Severity",
    "CWE Id",
    "Description",
    "Evidence",
    "Solution",
    "Reference",
  ];

  return arrayToCsv(vulnerabilities, headers);
};

// Public API
export const buildSingleComprehensiveCsvReport = (report) =>
  generateSimplifiedVulnerabilitiesCsv(report?.alerts || report?.vulnerabilities || []);

export const downloadComprehensiveCsvReport = async (csvContent, filename) => {
  const csvFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  // React Native / Windows native module path
  try {
    // Check if we're in React Native Windows environment
    if (Platform && Platform.OS === 'windows') {
      // Use destructuring like reportDownload.js - this is the standard way
      const { FileSaveModule } = NativeModules;

      // Log available modules for debugging (always log in release to help diagnose)
      console.log('CSV Download - Available NativeModules:', NativeModules ? Object.keys(NativeModules) : 'null');
      console.log('CSV Download - FileSaveModule:', FileSaveModule);
      console.log('CSV Download - FileSaveModule.saveFile:', FileSaveModule?.saveFile);

      try {
        if (FileSaveModule && FileSaveModule.saveFile) {
          try {
            console.log('Attempting to save CSV file using native module...');
            const base64 = Buffer.from(csvContent, 'utf-8').toString('base64');
            const result = await FileSaveModule.saveFile(base64, csvFilename);

            // Check if result is an error (prefixed with "ERROR:")
            if (result && typeof result === 'string' && result.startsWith('ERROR:')) {
              const errorMsg = result.substring(6); // Remove "ERROR:" prefix
              if (errorMsg.includes('cancelled')) {
                console.log('User cancelled file save');
                return { cancelled: true };
              }
              throw new Error(errorMsg);
            }

            if (result && !result.includes('Error')) {
              console.log(`CSV file saved successfully to: ${result}`);
              return { success: true, filePath: result };
            } else {
              throw new Error(result || 'Unknown error from native module');
            }
          } catch (nativeError) {
            console.error('Error calling native FileSaveModule:', nativeError);
            // Show error to user in React Native
            if (Alert && Alert.alert) {
              Alert.alert(
                'Download Failed',
                `Failed to save CSV file: ${nativeError.message || 'Unknown error'}\n\nPlease ensure the app has file system permissions.`
              );
            }
            throw nativeError;
          }
        } else {
          // Log detailed information about why module is not available
          console.error('FileSaveModule not available in NativeModules');
          console.error('NativeModules:', NativeModules);
          console.error('NativeModules type:', typeof NativeModules);
          console.error('NativeModules keys:', NativeModules ? Object.keys(NativeModules) : 'null');
          console.error('FileSaveModule value:', FileSaveModule);
          console.error('Platform.OS:', Platform?.OS);

          if (Alert && Alert.alert) {
            Alert.alert(
              'Download Not Available',
              'File save functionality is not available. The native module may not be properly registered in the release build.\n\nPlease check:\n1. That FileSaveModule is compiled into the release build\n2. That ReactPackageProvider includes FileSaveModule\n3. Check console logs for more details'
            );
          }
          throw new Error('FileSaveModule native module not available');
        }
      } catch (err) {
        console.error('Error ', err);
            // Show error to user in React Native
            if (Alert && Alert.alert) {
              Alert.alert(
                'Download Failed',
                `Err: ${err.message || 'Unknown error'}\n\nPlease ensure the app has file system permissions.`
              );
            }
            throw err;
      }

    }
  } catch (err) {
    console.error('CSV download error:', err);
    // Re-throw to let caller handle it
    throw err;
  }

  // Web browser fallback (should not reach here in React Native)
  if (typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", csvFilename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }
  }

  throw new Error("Download not supported in this environment.");
};



import { Buffer } from 'buffer';
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
    const { NativeModules, Platform } = require('react-native');
    const FileSaveModule = NativeModules?.FileSaveModule;
    if (Platform && Platform.OS === 'windows' && FileSaveModule?.saveFile) {
      const base64 = Buffer.from(csvContent, 'utf-8').toString('base64');
      const result = await FileSaveModule.saveFile(base64, csvFilename);
      return result;
    }
  } catch (err) {
    console.warn('Native module not available, using fallback:', err.message);
    // Not in React Native environment or module missing; fall through to web
  }

  // Web browser fallback
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

  console.warn("Download not supported in this environment.");
};



import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { XMLParser } from 'fast-xml-parser';

const ReportContext = createContext();

export const useReport = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
};

// XML to JSON conversion function
const convertXmlToJson = (xmlString) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "_",
    textNodeName: "__text",
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true,
  });
  
  try {
    const result = parser.parse(xmlString);
    console.log('Full parsed structure:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('XML parsing error:', error);
    return null;
  }
};

export const ReportProvider = ({ children }) => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch latest OpenVAS report
  const fetchLatestOpenVASReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Fetch all reports
      const reportsResponse = await fetch(
        'https://5hauyn0f3c.execute-api.ap-south-1.amazonaws.com/reports'
      );
      debugger;
      if (!reportsResponse.ok) {
        throw new Error('Failed to fetch reports list');
      }

      const reportsData = await reportsResponse.json();
      console.log('All reports:', reportsData);

      // Step 2: Find the latest report
      let latestReport = null;
      
      if (Array.isArray(reportsData)) {
        latestReport = reportsData.reduce((latest, current) => {
          const currentTime = new Date(current.lastModified || 0).getTime();
          const latestTime = new Date(latest?.lastModified || 0).getTime();
          return currentTime > latestTime ? current : latest;
        });
      }

      if (!latestReport) {
        throw new Error('No reports found');
      }

      console.log('Latest report:', latestReport);

      // Step 3: Fetch the latest report XML
      const reportKey = latestReport.key || latestReport.fullKey;
      const reportUrl = `https://5hauyn0f3c.execute-api.ap-south-1.amazonaws.com/reports/${reportKey}`;
      
      const xmlResponse = await fetch(reportUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      if (!xmlResponse.ok) {
        throw new Error('Failed to fetch latest report XML');
      }

      const xmlText = await xmlResponse.text();
      console.log('XML Response:', xmlText.substring(0, 500));

      // Step 4: Convert XML to JSON
      const jsonData = convertXmlToJson(xmlText);
      
      if (!jsonData) {
        throw new Error('Failed to parse XML report');
      }

      console.log('Converted JSON:', jsonData);
      
      setReportData(jsonData);
      
    } catch (err) {
      console.error('Error fetching latest report:', err);
      const errorMsg = err.message || 'Failed to fetch latest OpenVAS report';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch report on mount
  useEffect(() => {
    fetchLatestOpenVASReport();
  }, [fetchLatestOpenVASReport]);

  const value = {
    reportData,
    isLoading,
    error,
    fetchLatestOpenVASReport,
    setReportData,
    setIsLoading,
    setError,
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
};

export default ReportContext;


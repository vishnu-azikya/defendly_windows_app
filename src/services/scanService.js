import api, { buildHeaders } from './api';
import config from '../constants/config';

const normalizeListResponse = data => {
  try {
    console.log('Normalizing response data:', typeof data, data ? Object.keys(data).join(', ') : 'null/undefined');
    
    if (!data) {
      console.log('No data received, returning empty array');
      return [];
    }

    if (Array.isArray(data)) {
      console.log(`Data is array with ${data.length} items`);
      return data;
    }

    if (Array.isArray(data?.data)) {
      console.log(`Data.data is array with ${data.data.length} items`);
      return data.data;
    }

    if (Array.isArray(data?.results)) {
      console.log(`Data.results is array with ${data.results.length} items`);
      return data.results;
    }

    if (Array.isArray(data?.scans)) {
      console.log(`Data.scans is array with ${data.scans.length} items`);
      return data.scans;
    }

    console.log('Data is not in expected format, returning empty array. Data structure:', JSON.stringify(data, null, 2).substring(0, 200));
    return [];
  } catch (error) {
    console.error('Error normalizing response data:', error.message);
    return [];
  }
};

const buildQuery = (path, params) => {
  if (!params) {
    return path;
  }
  
  // Manual query string building (URLSearchParams not available in React Native)
  const queryParts = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });
  
  const qs = queryParts.join('&');
  return qs ? `${path}?${qs}` : path;
};

const tryGet = async (path, params) => {
  try {
    console.log('tryGet called with path:', path, 'params:', params);
    const fullUrl = buildQuery(path, params);
    console.log('Full URL being requested:', fullUrl);
    
    // Use longer timeout for scans API
    const timeout = path.includes('/scans') ? 60000 : 15000; // Increased timeout for large responses
    debugger
    const data = await api.get(fullUrl, { timeout });
    debugger;
    
    console.log('tryGet response received, data type:', typeof data, 'data is null:', data === null);
    
    if (data === null) {
      console.log('Received null data, treating as failure');
      return {ok: false, status: null, err: new Error('Received null response')};
    }
    
    console.log('tryGet successful for:', fullUrl);
    return {ok: true, data};
  } catch (err) {
    console.log('tryGet failed for:', buildQuery(path, params), 'Error:', err.message);
    
    // Handle specific error cases
    if (err.status === 413 || err.message.includes('too large') || err.needsPagination) {
      console.log('Response too large, will try with pagination');
      return {ok: false, status: 413, err, needsPagination: true};
    }
    
    return {ok: false, status: err?.status, err};
  }
};

// Helper function to fetch binary data (like PDFs) following the same pattern as tryGet
const tryGetBinary = async (path, params) => {
  try {
    console.log('tryGetBinary called with path:', path, 'params:', params);
    const fullUrl = buildQuery(path, params);
    console.log('Full URL being requested:', fullUrl);
    
    // Use much longer timeout for PDF downloads (PDF generation can take time)
    const timeout = 300000; // 5 minutes for PDF generation and download
    
    // Build headers using the same method as api module, overriding Accept for PDF
    // Remove Content-Type for GET requests (we're not sending a body)
    const headers = await buildHeaders({
      Accept: 'application/pdf',
    });
    // Remove Content-Type header for GET request
    delete headers['Content-Type'];
    
    // Create AbortController for timeout
    let controller, timeoutId;
    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => {
        console.warn('PDF download timeout - aborting request');
        controller.abort();
      }, timeout);
    } catch (abortError) {
      console.warn('AbortController not supported, timeout will not work:', abortError.message);
      controller = null;
    }
    
    // Make fetch request directly (similar to api.request but for binary)
    const fetchOptions = {
      method: 'GET',
      headers: headers,
    };
    if (controller) {
      fetchOptions.signal = controller.signal;
    }
    
    let response;
    try {
      response = await fetch(`${config.API_BASE_URL}${fullUrl}`, fetchOptions);
      
      // Clear timeout once we have the response
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    } catch (fetchError) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Handle abort errors specifically
      if (fetchError.name === 'AbortError' || fetchError.message === 'Aborted') {
        const error = new Error('PDF download timed out. The report may be too large or the server is taking too long to generate it.');
        error.status = 408; // Request Timeout
        error.isTimeout = true;
        throw error;
      }
      throw fetchError;
    }
    
    console.log(`tryGetBinary response received - Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to download binary: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    
    // Get the binary data as arrayBuffer (this can also take time for large files)
    let arrayBuffer;
    try {
      arrayBuffer = await response.arrayBuffer();
    } catch (bufferError) {
      if (bufferError.name === 'AbortError' || bufferError.message === 'Aborted') {
        const error = new Error('PDF download timed out while receiving data. The file may be too large.');
        error.status = 408;
        error.isTimeout = true;
        throw error;
      }
      throw bufferError;
    }
    
    const binaryData = new Uint8Array(arrayBuffer);
    
    console.log('tryGetBinary successful, size:', binaryData.length, 'bytes');
    return {ok: true, data: binaryData};
  } catch (err) {
    console.log('tryGetBinary failed for:', buildQuery(path, params), 'Error:', err.message);
    return {ok: false, status: err?.status, err};
  }
};

// Force route rediscovery by setting to null
let ORG_SCANS_ROUTE = null;
const ORG_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedOrgScans = key => {
  const cached = ORG_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    ORG_CACHE.delete(key);
  }
  return null;
};

const setCachedOrgScans = (key, data) => {
  ORG_CACHE.set(key, {data, timestamp: Date.now()});
};

// Function to clear route cache and force rediscovery
const clearRouteCache = () => {
  ORG_SCANS_ROUTE = null;
  console.log('Cleared API route cache, will rediscover endpoints');
};

// Test function to verify API endpoint directly (simplified)
const testScansEndpoint = async (orgId) => {
  console.log('=== TESTING SCANS ENDPOINT DIRECTLY ===');
  const testUrl = `/api/scans?organizationId=${orgId}`;
  console.log('Testing URL:', testUrl);
  
  try {
    // Use the api module to get headers (which includes token)
    const response = await api.get(testUrl);
    console.log('Direct API test successful, response type:', typeof response);
    console.log('Direct API test response preview:', JSON.stringify(response).substring(0, 200));
    return { success: true, data: response };
  } catch (error) {
    console.error('Direct API test error:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper function to fetch scans with streaming/chunked processing
const getScansByOrganizationIdWithStreaming = async (orgId) => {
  console.log(`=== getScansByOrganizationIdWithStreaming CALLED ===`);
  
  try {
    // Just get the data with organizationId - no fake pagination params
    const result = await tryGet('/api/scans', { organizationId: orgId });
    if (result.ok) {
      return {
        success: true,
        data: normalizeListResponse(result.data)
      };
    }
    return { success: false, error: result.err };
  } catch (error) {
    console.error('Error in streaming fetch:', error.message);
    return { success: false, error };
  }
};

export async function getScansByOrganizationId(orgId, options = {}) { 
  console.log('=== getScansByOrganizationId CALLED ===');
  try {
    if (!orgId) {
      console.log('No organization ID provided');
      return [];
    }

    console.log(`Getting scans for organization ID: ${orgId}`);
    
    // Check if this is the problematic organization with large dataset
    const LARGE_DATASET_ORG_ID = '2c2254b3-2306-480d-8881-ee761a467dc2';
    if (orgId === LARGE_DATASET_ORG_ID) {
      console.log('Detected organization with known large dataset, skipping API call');
      throw new Error('DATASET_TOO_LARGE: This organization (Azikya) has a very large scan dataset (37MB+) that cannot be loaded in the mobile app. Please use the web version for full access to your scan history.');
    }
    
    // Use direct approach like the website - no fake pagination
    const { maxItems = 10000 } = options; // Allow more items like the website
    
    const cacheKey = `org-${orgId}`;
    const cached = getCachedOrgScans(cacheKey);
    if (cached) {
      console.log('Returning cached scan data');
      return cached;
    }

  const encoded = encodeURIComponent(orgId);
  const normalizeOk = data => {
    try {
      console.log('Processing successful API response');
      const normalized = normalizeListResponse(data);
      setCachedOrgScans(cacheKey, normalized);
      console.log(`Normalized and cached ${normalized.length} scan items`);
      return normalized;
    } catch (error) {
      console.error('Error in normalizeOk:', error.message);
      return [];
    }
  };

  const tryRoute = async route => {
    if (!route) {
      return null;
    }
    if (route === 'query') {
      console.log('Trying query parameter route: /api/scans?organizationId=');
      const r = await tryGet('/api/scans', {organizationId: orgId});
      if (r.ok) {
        console.log('Query parameter route successful');
        return normalizeOk(r.data);
      }
      console.log(`Query parameter route failed with status: ${r.status}`);
      if ([404, 405, 501].includes(r.status || 0)) {
        ORG_SCANS_ROUTE = null;
      } else if (r.status) {
        throw r.err;
      }
      return null;
    }
    if (route === 'organizationsPath') {
      const r = await tryGet(`/api/organizations/${encoded}/scans`);
      if (r.ok) {
        return normalizeOk(r.data);
      }
      if ([404, 405, 501].includes(r.status || 0)) {
        ORG_SCANS_ROUTE = null;
      } else if (r.status) {
        throw r.err;
      }
      return null;
    }
    if (route === 'legacy') {
      const r = await tryGet(`/api/scans/organization/${encoded}`);
      if (r.ok) {
        return normalizeOk(r.data);
      }
      if ([404, 405, 501].includes(r.status || 0)) {
        ORG_SCANS_ROUTE = null;
      } else if (r.status) {
        throw r.err;
      }
      return null;
    }
    return null;
  };

  // Try cached route first (if we have one)
  if (ORG_SCANS_ROUTE) {
    console.log(`Trying cached route: ${ORG_SCANS_ROUTE}`);
    const cachedRouteResult = await tryRoute(ORG_SCANS_ROUTE);
    if (cachedRouteResult) {
      return cachedRouteResult;
    }
    // If cached route failed, clear it and try discovery
    console.log('Cached route failed, clearing cache and trying discovery');
    ORG_SCANS_ROUTE = null;
  }

  // Test the endpoint directly first (temporarily disabled to debug crash)
  // await testScansEndpoint(orgId);

  // For other organizations, try the normal API call
  console.log('Attempting to fetch scans from API for organization:', orgId);
  
  try {
    const result = await tryGet('/api/scans', { organizationId: orgId });
    
    if (result.ok) {
      console.log('API call successful, processing response...');
      const normalized = normalizeListResponse(result.data);
      console.log(`Successfully processed ${normalized.length} scans`);
      
      // Apply frontend limiting if needed
      let finalData = normalized;
      if (finalData.length > maxItems) {
        console.log(`Limiting results to ${maxItems} items (from ${finalData.length})`);
        finalData = finalData.slice(0, maxItems);
      }
      
      setCachedOrgScans(cacheKey, finalData);
      return finalData;
    } else {
      // Check if it's a dataset too large error
      if (result.err?.isDatasetTooLarge) {
        console.error('Dataset too large for mobile app:', result.err.message);
        throw new Error('DATASET_TOO_LARGE: ' + result.err.message);
      }
      
      console.error('API call failed:', result.err?.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching scans:', error.message);
    
    // Re-throw dataset too large errors so the UI can handle them
    if (error.message.includes('DATASET_TOO_LARGE')) {
      throw error;
    }
    
    return [];
  }

  // If direct approach failed, return empty array
  console.log('Direct API approach completed, no additional routes to try');
  return [];
  } catch (error) {
    console.error('Fatal error in getScansByOrganizationId:', error.message, error.stack);
    ORG_SCANS_ROUTE = null;
    return [];
  }
}

export async function getScansByOrganization(orgName) {
  if (!orgName) {
    return [];
  }
  const r = await tryGet('/api/scans', {organization: orgName});
  return r.ok ? normalizeListResponse(r.data) : [];
}

export async function getScansByUserId(userId) {
  if (!userId) {
    return [];
  }
  const encoded = encodeURIComponent(userId);
  const primary = await tryGet(`/api/users/${encoded}/scans`);
  if (primary.ok) {
    return normalizeListResponse(primary.data);
  }
  const secondary = await tryGet(`/api/scans/user/${encoded}`);
  if (secondary.ok) {
    return normalizeListResponse(secondary.data);
  }
  const tertiary = await tryGet(`/api/scans/${encoded}`);
  if (tertiary.ok) {
    return normalizeListResponse(tertiary.data);
  }
  const generic = await tryGet('/api/scans', {userId});
  return generic.ok ? normalizeListResponse(generic.data) : [];
}

export async function getAllScans() {
  const res = await tryGet('/api/scans');
  return res.ok ? normalizeListResponse(res.data) : [];
}

export async function getScanById(scanId) {
  if (!scanId) {
    return null;
  }
debugger;
  const encoded = encodeURIComponent(scanId);
  const responses = [
    () => tryGet(`/api/scans/${encoded}`),
    () => tryGet(`/api/scans/by-id/${encoded}`),
    () => tryGet(`/api/scans`, {id: scanId}),
    () => tryGet(`/api/scans`, {scan_id: scanId}),
  ];

  for (const request of responses) {
    const result = await request();
    debugger;
    if (result.ok) {
      return result.data;
    }
  }

  return null;
}

// Export function for components to explicitly request paginated data
export async function getScansByOrganizationIdWithPagination(orgId, maxItems = 1000) {
  return getScansByOrganizationId(orgId, { usePagination: true, maxItems });
}

// Export function for components to try non-paginated first (for smaller datasets)
export async function getScansByOrganizationIdNoPagination(orgId) {
  return getScansByOrganizationId(orgId, { usePagination: false });
}

// Function to initiate a new scan
export async function initiateScan(scanData) {
  console.log('Initiating scan with data:', scanData);
  
  try {
    // Prepare the scan payload based on the website's format
    const payload = {
      url: scanData.scanTarget,
      projectName: scanData.projectName,
      label: scanData.label,
      organization: scanData.organization,
      schedule: scanData.schedule,
      scheduledDate: scanData.scheduledDate,
      scheduledTime: scanData.scheduledTime,
      recurrence: scanData.recurrence,
      // Auth scan fields
      ...(scanData.email && { email: scanData.email }),
      ...(scanData.password && { password: scanData.password }),
      ...(scanData.loginUrl && { loginUrl: scanData.loginUrl }),
      // Multiple targets if provided
      ...(scanData.scanTargets && scanData.scanTargets.length > 1 && { 
        scanTargets: scanData.scanTargets 
      }),
    };

    console.log('Sending scan initiation request with payload:', payload);
    
    // Call the API to initiate scan
    const result = await api.post('/api/scans/initiate', payload);
    
    console.log('Scan initiation response:', result);
    
    // Return the scan result with normalized ID
    return {
      ...result,
      scan_id: result.scan_id || result._id || result.id || Date.now().toString(),
      status: result.status || 'in-progress',
      url: scanData.scanTarget,
      project: scanData.projectName,
      organization: scanData.organization,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error initiating scan:', error);
    throw error;
  }
}

// Function to poll scan status
export async function pollScanStatus(scanId, onStatusUpdate) {
  console.log(`Starting to poll scan status for: ${scanId}`);
  
  let intervalId = null;
  let stopped = false;
  
  const checkStatus = async () => {
    if (stopped) return;
    
    try {
      console.log(`Polling status for scan: ${scanId}`);
      const scanData = await getScanById(scanId);
      
      if (!scanData) {
        console.warn(`No data found for scan: ${scanId}`);
        return;
      }
      
      const status = scanData.status || 'in-progress';
      console.log(`Scan ${scanId} status: ${status}`);
      
      // Call the status update callback
      if (onStatusUpdate) {
        onStatusUpdate(status, scanData);
      }
      
      // Stop polling if scan is completed
      if (status === 'completed' || status === 'failed' || status === 'error') {
        stopped = true;
        if (intervalId) {
          clearInterval(intervalId);
        }
        console.log(`Stopped polling for completed scan: ${scanId}`);
      }
    } catch (error) {
      console.error(`Error polling scan ${scanId}:`, error);
    }
  };
  
  // Check immediately
  await checkStatus();
  
  // Only start interval if not stopped
  if (!stopped) {
    intervalId = setInterval(checkStatus, 5000); // Poll every 5 seconds
  }
  
  // Return cleanup function
  return () => {
    stopped = true;
    if (intervalId) {
      clearInterval(intervalId);
    }
    console.log(`Stopped polling for scan: ${scanId}`);
  };
}

// Helper function to extract domain from URL
export function extractDomain(url) {
  if (!url) return 'Unnamed Target';
  
  try {
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    domain = domain.split('/')[0];
    return domain;
  } catch (e) {
    return url;
  }
}

// Helper function to check if organization dataset is too large
export function isOrganizationDatasetTooLarge(orgId) {
  const LARGE_DATASET_ORG_ID = '2c2254b3-2306-480d-8881-ee761a467dc2';
  return orgId === LARGE_DATASET_ORG_ID;
}

export async function getScans(page = 1, limit = 10) {
  debugger;
  const r = await tryGet('/api/scans/exe', { page, limit });
  debugger;
  if (!r.ok) {
    return { data: [], pagination: null };
  }
  
  // Handle the nested response structure: { data: { data: [...], pagination: {...} } }
  const responseData = r.data;
  
  // Extract scans array and pagination info
  let scans = [];
  let pagination = null;
  
  if (responseData) {
    // Check if data is nested (new format with pagination)
    if (responseData.data && Array.isArray(responseData.data)) {
      scans = responseData.data;
      pagination = responseData.pagination || null;
    } else if (Array.isArray(responseData)) {
      // Fallback: if response is directly an array
      scans = responseData;
    } else {
      // Try normalizeListResponse as fallback
      scans = normalizeListResponse(responseData);
    }
  }
  
  return {
    data: scans,
    pagination: pagination
  };
}

// Function to download PDF report from backend API
export async function downloadPdfReport(scanId) {
  if (!scanId) {
    throw new Error('Scan ID is required');
  }

  try {
    console.log(`Downloading PDF report for scan: ${scanId}`);
    
    const encoded = encodeURIComponent(scanId);
    const result = await tryGetBinary(`/api/reports/pdf/${encoded}`);
    if (!result.ok) {
      throw result.err || new Error('Failed to download PDF report');
    }
    
    console.log(`PDF downloaded successfully. Size: ${result.data.length} bytes`);
    return result.data;
  } catch (error) {
    console.error('Error downloading PDF report:', error);
    throw error;
  }
}

export default {
  getScansByOrganizationId,
  getScansByOrganizationIdWithPagination,
  getScansByOrganization,
  getScansByUserId,
  getAllScans,
  getScanById,
  initiateScan,
  pollScanStatus,
  extractDomain,
  isOrganizationDatasetTooLarge,
  clearRouteCache,
  getScans,
  downloadPdfReport
};


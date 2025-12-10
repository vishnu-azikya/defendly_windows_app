import config from '../constants/config';
import TokenManager from '../utils/tokenManager';

async function buildHeaders(customHeaders = {}) {
  const token = await TokenManager.getToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'DefendlyWindowsApp/1.0',
    'Origin': 'http://localhost:8081',
    ...customHeaders,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  try {
    console.log(`Processing response - Status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);
    
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    
    // Check response size before processing
    const contentLength = response.headers.get('content-length');
    const responseSize = contentLength ? parseInt(contentLength, 10) : 0;
    console.log(`Response size: ${responseSize} bytes (${(responseSize / 1024 / 1024).toFixed(2)} MB)`);
    
    // React Native can't handle responses this large - reject immediately
    const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB - conservative limit for React Native
    if (responseSize > MAX_RESPONSE_SIZE) {
      console.error(`Response too large for React Native: ${responseSize} bytes exceeds ${MAX_RESPONSE_SIZE} bytes limit`);
      
      // Don't even try to parse - immediately abort the response
      try {
        response.body?.cancel?.(); // Cancel the stream if possible
      } catch (cancelError) {
        console.log('Could not cancel response stream:', cancelError.message);
      }
      
      const error = new Error(`Dataset too large (${(responseSize / 1024 / 1024).toFixed(2)}MB) for mobile app. Please use filters or contact support for data export.`);
      error.status = 413; // Payload Too Large
      error.responseSize = responseSize;
      error.isDatasetTooLarge = true;
      throw error;
    }
    
    // For responses between 5MB and 10MB, add warning
    if (responseSize > 5 * 1024 * 1024) {
      console.warn(`Large response detected: ${(responseSize / 1024 / 1024).toFixed(2)}MB - processing carefully`);
    }
    
    console.log(`Parsing response as ${isJson ? 'JSON' : 'text'}`);
    
    let payload;
    try {
      if (isJson) {
        // Conservative timeout for React Native
        const parseTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('JSON parsing timeout after 30 seconds')), 30000)
        );
        
        console.log('Starting JSON parsing...');
        const parsePromise = response.json();
        payload = await Promise.race([parsePromise, parseTimeout]);
        
        console.log(`JSON parsed successfully, type: ${typeof payload}`);
        
        // Handle the parsed data efficiently
        if (payload && typeof payload === 'object') {
          if (Array.isArray(payload)) {
            console.log(`JSON structure: Array with ${payload.length} items`);
          } else {
            const keys = Object.keys(payload);
            console.log(`JSON keys: ${keys.join(', ')}`);
            console.log('JSON structure: Object with', keys.length, 'properties');
          }
        }
      } else {
        payload = await response.text();
        console.log(`Text parsed successfully, length: ${payload ? payload.length : 0}`);
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError.message);
      
      // If it's a timeout or memory error, provide helpful error message
      if (parseError.message.includes('timeout')) {
        throw new Error(`Response parsing timed out. The server response may be too large or the connection too slow.`);
      }
      
      if (parseError.message.includes('memory')) {
        throw new Error(`Insufficient memory to parse response. Try refreshing the app.`);
      }
      
      // For other parsing errors, try to provide a meaningful error
      console.error('JSON parsing failed, returning null payload');
      payload = null;
    }

    if (response.status === 401) {
      console.log('401 status detected, clearing token');
      await TokenManager.clearToken();
    }

    if (!response.ok) {
      console.log(`Response not OK, status: ${response.status}`);
      const error = new Error(
        (payload && payload.message) || `Request failed with status ${response.status}`,
      );
      error.status = response.status;
      error.data = payload;
      throw error;
    }

    console.log('Response processing completed successfully');
    return payload;
  } catch (error) {
    console.error('Error in handleResponse:', error.message, error.stack);
    throw error;
  }
}

async function request(path, {method = 'GET', body, headers, timeout = 15000, ...restOptions} = {}) {
  try {
    // Validate path parameter
    if (!path || typeof path !== 'string') {
      throw new Error('API path is required and must be a string');
    }
    
    const finalHeaders = await buildHeaders(headers);
    let finalBody = body;
    
    // Handle body serialization with error handling
    if (body !== null && body !== undefined) {
      if (typeof body === 'object' && !(body instanceof FormData)) {
        try {
          finalBody = JSON.stringify(body);
        } catch (jsonError) {
          console.error('Error serializing request body:', jsonError.message);
          throw new Error(`Failed to serialize request body: ${jsonError.message}`);
        }
      } else if (body instanceof FormData) {
        delete finalHeaders['Content-Type'];
      }
    }
    
    // Create AbortController for timeout (with fallback for older environments)
    let controller, timeoutId;
    try {
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeout);
    } catch (abortError) {
      console.warn('AbortController not supported, timeout will not work:', abortError.message);
      controller = null;
    }
    
    console.log(`Making API request to: ${config.API_BASE_URL}${path}`);
    console.log('Request headers:', JSON.stringify(finalHeaders, null, 2));
    console.log('Request method:', method);
    console.log('Request body:', finalBody ? 'Present' : 'None');
    
    const fetchOptions = {
      method,
      headers: finalHeaders,
      body: finalBody,
      ...restOptions,
    };
    
    // Only add signal if AbortController is supported
    if (controller) {
      fetchOptions.signal = controller.signal;
    }
    
    const response = await fetch(`${config.API_BASE_URL}${path}`, fetchOptions);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    console.log(`API response received - Status: ${response.status}`);
    
    let result;
    try {
      console.log('About to process response...');
      result = await handleResponse(response);
      console.log(`API request completed successfully`);
      return result;
    } catch (responseError) {
      console.error('Error processing response:', responseError.message, responseError.stack);
      // Return a safe fallback instead of crashing
      return null;
    }
  } catch (error) {
    console.log('API Request Error:', error.message);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - API server may be unreachable');
    }
    throw error;
  }
}

const api = {
  get: (path, options) => request(path, {...options, method: 'GET'}),
  post: (path, body, options) => request(path, {...options, method: 'POST', body}),
  put: (path, body, options) => request(path, {...options, method: 'PUT', body}),
  patch: (path, body, options) => request(path, {...options, method: 'PATCH', body}),
  delete: (path, options) => request(path, {...options, method: 'DELETE'}),
  request,
};

export default api;


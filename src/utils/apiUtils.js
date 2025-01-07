const axios = require("axios");

class ApiUtils {
  static async makeRequest(url, method, headers, data) {
    try {
      let axiosConfig = {
        method,
        url,
        headers,
      };

      // Handle GET requests separately
      if (method.toLowerCase() === "get") {
        axiosConfig.params = data;
      } else {
        axiosConfig.data = data;
      }

      const response = await axios(axiosConfig);
      return this.handleResponse(response);
    } catch (error) {
      let reqData = { method, url, headers, data, error };
      throw new Error(`API request failed: ${JSON.stringify(reqData)}`);
    }
  }

  static handleResponse(response) {
    const status =
      !!(response.status >= 200 && response.status < 300) ||
      !!(response.statusCode >= 200 && response.statusCode < 300);
    if (status) {
      return response.data;
    } else {
      return new Error(`API request failed: ${response.status}`);
    }
  }

  static handleError(error) {
    console.error("API Error:", error.message);
    return error;
  }
}

module.exports = ApiUtils;

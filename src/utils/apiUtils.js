const axios = require('axios');

class ApiUtils {
  static async makeRequest(url, method, headers, data) {
    try {
      return await axios({
        method,
        url,
        headers,
        data
      });
    } catch (error) {
      let data = {method,url,headers,data, error}
      throw new Error(`API request failed: ${data}`);
    }
  }

  static handleResponse(response) {
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      return new Error(`API request failed: ${response.status}`);
    }
  }

  static handleError(error) {
    console.error('API Error:', error.message);
    return error;
  }
}

module.exports = ApiUtils;
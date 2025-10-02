/**
 * Get appId configuration from DB by on object key variables
 * @param data - configs array. Eg: [
 *     { 'mfaMobile.Dev.service.mandaiapi.ciam': { "lambda_api_key": "mfa.mobile"} },
 *     { 'nopComm.Dev.servicehub.mandaipvtapi.ciam': { "lambda_api_key": "nopCommerce.private"} }
 *   ]
 * @param appId - appId need to get config. Eg: nopComm.Dev.servicehub.mandaipvtapi.ciam
 * @return {Object} - Eg: { "lambda_api_key": "nopCommerce.private"}
 */
function getAppIdConfiguration(data, appId) {
  const findAppIdConfig = data.find((value) => {
    const key = Object.keys(value);
    if (key[0] === appId) {
      return value;
    }
    return undefined;
  });
  return findAppIdConfig ? Object.values(findAppIdConfig)[0] : undefined;
}

module.exports = {
  getAppIdConfiguration,
};

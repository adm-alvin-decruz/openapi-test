/**
 * Function cleanData
 *
 * @param {json} reqData
 * @returns new cleaned
 */
function cleanData(reqData){
	Object.keys(reqData).forEach(function(key) {
			reqData[key] = trimWhiteSpace (reqData[key]);
	})
	return reqData;
}

/**
 * Function trimWhiteSpace
 *
 * @param {string} str
 * @returns string
 */
function trimWhiteSpace (str){
	return str.trim()
}

/**
 * Validate App ID
 *
 * @param {*} env
 * @param {*} reqHeader
 * @returns
 */
function validateAppID(env, reqHeader){
	var mwgAppID = reqHeader['mwg-app-id'];

	if(mwgAppID !== ''){
		if(mwgAppID === env.AEM_APP_ID){
			return true;
		}
	}
	return false;
}

module.exports = {
  cleanData,
  validateAppID
}
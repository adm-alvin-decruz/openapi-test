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
 * @param {string} str
 * @returns string
 */
function trimWhiteSpace (str){
    return str.trim()
}

module.exports = {
    cleanData
}
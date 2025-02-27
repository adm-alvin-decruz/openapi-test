function getOrCheck(attr, name, value = "") {
  const userAttr =
    attr.UserAttributes && attr.UserAttributes.length > 0
      ? attr.UserAttributes
      : [];

  if (userAttr.length > 0) {
    const findAttrMatched = userAttr.find((attr) => attr.Name === name);
    if (value !== "" && findAttrMatched.Value === value) {
      return true;
    } else if (findAttrMatched === undefined) {
      return false
    }

    return findAttrMatched && findAttrMatched.Value ? findAttrMatched.Value : '';
  }
  return false;
}

module.exports = {
  getOrCheck,
};

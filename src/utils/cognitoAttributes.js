function getOrCheck(attr, name, value = "") {
  let userAttr =
    attr.UserAttributes && attr.UserAttributes.length > 0
      ? attr.UserAttributes
      : [];

  if (userAttr.length > 0) {
    const findAttrMatched = userAttr.find((attr) => attr.Name === name);
    if (value !== "" && findAttrMatched.Value === value) {
      return true;
    }
    return findAttrMatched.Value;
  }
  return false;
}

module.exports = {
  getOrCheck,
};

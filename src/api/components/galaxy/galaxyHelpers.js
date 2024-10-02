function findProductValue(input, name, findValue) {
  // Check if input is a string, if so, parse it
  const data = typeof input === 'string' ? JSON.parse(input) : input;

  // Access the products array
  const products = data.products.product;

  // Iterate through the products
  for (const product of products) {
    // Check if the product has a passKindName matching findValue
    if (product.dataRequestResponse && product.dataRequestResponse.passKindName === findValue) {
      // If found, search for the name in the product or its nested objects
      return findNestedValue(product, name);
    }
  }

  // If no matching product is found, return null
  return null;
}

function findNestedValue(obj, key) {
  // If the key exists at the current level, return its value
  if (obj.hasOwnProperty(key)) {
    return obj[key];
  }

  // If the current object is not an object or is null, return null
  if (typeof obj !== 'object' || obj === null) {
    return null;
  }

  // Recursively search nested objects
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      const result = findNestedValue(obj[k], key);
      if (result !== null) {
        return result;
      }
    }
  }

  // If the key is not found in any nested object, return null
  return null;
}

module.exports = {
  findProductValue
}
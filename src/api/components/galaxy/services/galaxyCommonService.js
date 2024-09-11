async function mapImputToImportParams(input, importData) {
  // Helper function to format date
  function formatDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Helper function to update nested properties
  function updateNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  // Clone the import data to avoid modifying the original
  let result = JSON.parse(JSON.stringify(importData));

  // Process top-level properties
  for (const [key, value] of Object.entries(input)) {
    if (key in result) {
      if (key === 'dob') {
        result[key] = formatDate(value);
      } else {
        result[key] = value;
      }
    }
  }

  // Process member properties
  if (result.members && result.members.length > 0) {
    for (const [key, value] of Object.entries(input)) {
      if (key in result.members[0]) {
        if (key === 'dob') {
          updateNestedProperty(result, `members.0.${key}`, formatDate(value));
        } else {
          updateNestedProperty(result, `members.0.${key}`, value);
        }
      }
    }
  }

  // Handle newsletter separately as it's an object in input
  if ('newsletter' in input && typeof input.newsletter === 'object') {
    result.user03 = input.newsletter.subscribe ? 'YES' : 'NO';
  }

  // update user 10 - mandai ID
  if ('mandaiID' in input && typeof input.mandaiID === 'string') {
    result.user10 = input.mandaiID;
  }

  return result;
}

module.exports = {
  mapImputToImportParams
};
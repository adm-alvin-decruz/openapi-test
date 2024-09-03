const crypto = require('crypto');

/**
 * Generate mandaiID
 *
 * @param {json} reqBody
 * @returns {string} mandaiID
 */
function generateMandaiID(reqBody) {
  let source = reqBody.source;
  let group = reqBody.group;

  // Define source and group mappings
  const sourceMappings = {
    ORGANIC: 'GA',
    TICKETING: 'TK',
    GLOBALTIX: 'BX'
  };

  const groupMappings = {
    wildpass: 'WP',
    fow: 'FW',
    fowp: 'FWP',
    fom: 'FM',
    fomp: 'FMP'
  };

  // Validate inputs
  if (!sourceMappings[source]) {
    return {"error": 'Invalid source'};
  }
  if (!groupMappings[group]) {
    return {"error": 'Invalid group'};
  }

  // Generate the base string for hashing
  const baseString = `${reqBody.email}${reqBody.dob}${reqBody.firstName}${reqBody.lastName}`;

  // Generate a hash
  const hash = crypto.createHash('sha256').update(baseString).digest('hex');

  // Extract numbers from the hash
  const numbers = hash.replace(/\D/g, '');

  // Construct the Unique ID
  let uniqueID = 'M'; // First character is always 'M'

  // Add group characters
  uniqueID += groupMappings[group];

  // Add source characters
  uniqueID += sourceMappings[source];

  // Add numbers
  if (['fowp', 'fomp'].includes(group)) {
    uniqueID += numbers.slice(0, 10);
  } else {
    uniqueID += numbers.slice(0, 11);
  }

  return uniqueID;
}

/**
 * Generate random chars
 *
 * @param {string} str
 * @param {int} count
 * @returns
 */
function getRandomChars(str, count) {
  const chars = str.split('');
  const result = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * chars.length);
    result.push(chars.splice(index, 1)[0]);
  }
  return result.join('');
}

/**
 * Generate visualID
 * @param {json} reqBody
 * @returns
 */
function generateVisualID(reqBody) {
  let source = reqBody.source;
  let group = reqBody.group;

  // Define source and group mappings
  const sources = { ORGANIC: '1', TICKETING: '2', GLOBALTIX: '3' };
  const groups = { wildpass: '1', fow: '2', fop: '3' };

  // Get current date
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  // Combine personal info
  const personalInfo = `${source}${group}${reqBody.email}${reqBody.dob}${reqBody.firstName}${reqBody.lastName}`.replace(/[^a-zA-Z0-9]/g, '');

  // Generate 14 numbers from personal info
  const hash = crypto.createHash('md5').update(personalInfo).digest('hex');
  const numbers = hash.replace(/[a-f]/g, '').slice(0, 14);

  // Combine all parts
  return `${year}${sources[source]}${groups[group]}${month}${numbers}`;
}

module.exports = {generateMandaiID, generateVisualID};
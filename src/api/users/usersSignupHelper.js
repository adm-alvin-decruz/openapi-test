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

  // Define source unique characters
  const sourceChars = {
    ORGANIC: 'ORANC',
    TICKETING: 'TKEI',
    GLOBALTIX: 'GLBAX'
  };

  // Generate group special characters
  const groupChars = group.toUpperCase().replace(/[AEIOU]/g, '').slice(0, 2);

  // Combine personal info
  const personalInfo = `${reqBody.email}${reqBody.dob}${reqBody.firstName}${reqBody.lastName}`.replace(/[^a-zA-Z0-9]/g, '');

  // Generate 10 numbers from personal info
  const numbers = crypto.createHash('md5').update(personalInfo).digest('hex')
    .replace(/[a-f]/g, '')
    .slice(0, 10);

  // Get two random characters from source
  const sourceRandomChars = getRandomChars(sourceChars[source], 2);

  // Generate random A-Z character
  const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));

  // Combine all parts
  return `M${groupChars}${numbers}${sourceRandomChars}${randomChar}`;
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
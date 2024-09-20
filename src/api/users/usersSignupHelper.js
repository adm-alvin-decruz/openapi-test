const crypto = require('crypto');
// db
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const dbConfig = require('../../config/dbConfig');
const log = [];

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

async function createUserSignupDB(req){
  req.apiTimer.log('usersSignupHelper.createUserSignupDB'); // log process time
  // insert to user table
  let newUserResult= await insertUser(req);
  if(!newUserResult.error){
    // insert to membership table
    let newMembershipResult = await insertUserMembership(req, newUserResult.user_id);
    // insert to newsletter table
    let newUserNewsLetterResult = await insertUserNewletter(req, newUserResult.user_id);
    // insert to credential table
    let newUserCredentialResult = await insertUserCredential(req, newUserResult.user_id);
    // if group non wildpass, insert user credential
    let response = {
      newUserResult: JSON.stringify(newUserResult),
      newMembershipResult: JSON.stringify(newMembershipResult),
      newUserNewsLetterResult: JSON.stringify(newUserNewsLetterResult),
      newUserCredentialResult: JSON.stringify(newUserCredentialResult)
    }
    if(req.body.group !== 'wildpass'){
      // TODO: insert user details
      response['newUserDetailResult'] = await insertUserDetail(req, newUserResult.user_id);
    }

    req.apiTimer.end('usersSignupHelper.createUserSignupDB'); // log end time
    return response;
  }
  else{
    req.apiTimer.end('usersSignupHelper.createUserSignupDB'); // log end time
    throw newUserResult;
  }

}

/**
 * Function Insert User to DB
 *
 * @param {json} req
 * @returns
 */
async function insertUser(req){
  // process source
  let envSource = JSON.parse(dbConfig.SOURCE_DB_MAPPING);

  try {
    // Create a new user
    const result = await userModel.create({
      email: req.body.email,
      given_name: req.body.firstName,
      family_name: req.body.lastName,
      birthdate: req.body.dob,
      mandai_id: req.body.mandaiID,
      source: envSource[req.body.source],
      active: true
    });

    return result;

  } catch (error) {
    throw error
    return {error: error};
  }
}

/**
 * Function insert User Membership to DB
 *
 * @param {json} req
 * @param {string} dbUserID
 * @returns
 */
async function insertUserMembership(req, dbUserID){
  // process membership data
  let expireDate = null; //TODO: update expiry for fow fow+
  if(req.body.group === 'wildpass'){
    let expireDate = null;
  }

  try {
    // Create a new user
    const result = await userMembershipModel.create({
      user_id: dbUserID,
      name: req.body.group,
      visual_id: req.body.visualID,
      expires_at: expireDate
    });

    return result;

  } catch (error) {
    throw error
  }
}

/**
 * Insert user'r newsletter to DB
 *
 * @param {json} req
 * @param {string} dbUserID
 * @returns
 */
async function insertUserNewletter(req, dbUserID){
  // process newsletter
  if(typeof req.body.newsletter != 'undefined'){
    var newsletterName = req.body.newsletter.name;
    var newslettertype = req.body.newsletter.type;
    var newsletterSubs = req.body.newsletter.subscribe;
  }
  try {
    // Create a new user
    const result = await userNewsletterModel.create({
      user_id: dbUserID,
      name: newsletterName,
      type: newslettertype,
      subscribe: newsletterSubs
    });

    return result;

  } catch (error) {
    throw error;
  }
}
/**
 * Insert user's credential to DB
 *
 * @param {json} req
 * @param {str} dbUserID
 * @returns
 */
async function insertUserCredential(req, dbUserID){
  // process credential data

  try {
    // Create a new user
    const result = await userCredentialModel.create({
      user_id: dbUserID,
      username: req.body.email, // cognito username is email
      password_hash: req.body.password,
      tokens: null,
      last_login: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });

    return result;

  } catch (error) {
    throw error;
  }
}

/**
 * Insert user's detail to DB
 *
 * @param {json} req
 * @param {string} dbUserID
 * @returns
 */
async function insertUserDetail(req, dbUserID){
  // process user detail
  try {
    // Create a new user
    const result = await userDetailModel.create({
      user_id: dbUserID,
      phone_number: '+1234567890',
      zoneinfo: 'SG',
      address: '123 Main St, City, Country',
      picture: null,
      vehicle_iu: 'IU123456',
      vehicle_plate: 'ABC123',
      extra: { favorite_color: 'blue' }
    });

    return result;

  } catch (error) {
    throw error;
  }
}

module.exports = {
  generateMandaiID,
  generateVisualID,
  createUserSignupDB
};
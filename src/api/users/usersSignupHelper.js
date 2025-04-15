const crypto = require('crypto');
// db
const userModel = require('../../db/models/userModel');
const userMembershipModel = require('../../db/models/userMembershipModel');
const userNewsletterModel = require('../../db/models/userNewletterModel');
const userCredentialModel = require('../../db/models/userCredentialModel');
const userDetailModel = require('../../db/models/userDetailsModel');
const userMigrationsModel = require('../../db/models/userMigrationsModel');
const dbConfig = require('../../config/dbConfig');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat} = require('../../utils/dateUtils');
const commonService = require("../../services/commonService");
const loggerService = require("../../logs/logger");
const cognitoService = require("../../services/cognitoService");

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
 * (Not IN USE FOR NOW) Generate visualID
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

async function createUserSignupDB(req, membershipData, userSubIdFromCognito){
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('usersSignupHelper.createUserSignupDB starts'); // log process time
  // insert to user table
  // if singup wildpass but account already have membership passes - reuse this for upsert
  const userExisted = !!membershipData && !!membershipData.userId;
  let newUserResult= userExisted ? await updateUser(membershipData.userId, req) : await insertUser(req);

  if(!newUserResult.error){
    // insert to membership table - membership-passes have empty so keep insert
    let newMembershipResult = await insertUserMembership(req, newUserResult.user_id);
    // upsert to newsletter table
    let newUserNewsLetterResult = await insertUserNewletter(req, newUserResult.user_id, userExisted);
    // insert to credential table - if membership-passes ignore update user credential
    let newUserCredentialResult = !userExisted ? await insertUserCredential(req, newUserResult.user_id, userSubIdFromCognito) : {};
    // upsert to detail table
    let newUserDetailResult = await insertUserDetail(req, newUserResult.user_id, userExisted);

    // user migrations - update user_migrations user ID
    if(req.body.migrations) {
      let userMigrationsResult = await updateUserMigration(req, newUserResult.user_id);
    }
    // if group non wildpass, insert user credential
    let response = {
      newUserResult: JSON.stringify(newUserResult),
      newMembershipResult: JSON.stringify(newMembershipResult),
      newUserNewsLetterResult: JSON.stringify(newUserNewsLetterResult),
      newUserCredentialResult: JSON.stringify(newUserCredentialResult),
      newUserDetailResult: JSON.stringify(newUserDetailResult)
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
      active: true,
      created_at: req.body.registerTime ? req.body.registerTime : getCurrentUTCTimestamp()
    });

    return result;

  } catch (error) {
    let catchError = new Error(`userSignupHelper.inserUserMembership error: ${error}`);
    console.log(catchError);
    return catchError;
  }
}

async function updateUser(userId, req) {
  const envSource = JSON.parse(dbConfig.SOURCE_DB_MAPPING);
  try {
    const updateUserRs = await userModel.update(userId, {
      given_name: req.body.firstName,
      family_name: req.body.lastName,
      birthdate: req.body.dob ? convertDateToMySQLFormat(req.body.dob) : undefined,
      source: envSource[commonService.setSource(req)],
      active: true,
      created_at: req.body.registerTime ? req.body.registerTime : getCurrentUTCTimestamp()
    })
    return {
      user_id: updateUserRs && updateUserRs.user_id ? updateUserRs.user_id : "",
      error: null
    }
  } catch (error) {
    loggerService.error(
        {
          userSignupHelper: {
            layer: 'userSignupHelper.updateUser',
            error: `${error}`
          },
        },
        {},
        "userSignupHelper.updateUser"
    );
    throw new Error(`userSignupHelper.updateUser error: ${error}`)
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
  let expireDate = null; // future todo: update expiry for fow fow+
  if(req.body.group === 'wildpass'){
    expireDate = null;
  }

  try {
    // Create a new user
    const result = await userMembershipModel.create({
      user_id: dbUserID,
      name: req.body.group,
      visual_id: req.body.visualID ? req.body.visualID : '',
      expires_at: expireDate
    });

    return result;

  } catch (error) {
    let catchError = new Error(`userSignupHelper.insertUserMembership error: ${error}`);
    console.log(catchError);
    return catchError;
  }
}

/**
 * Insert user'r newsletter to DB
 *
 * @param {json} req
 * @param {string} dbUserID
 * @param userExisted
 * @returns
 */
async function insertUserNewletter(req, dbUserID, userExisted){
  // process newsletter
  let newsletterName;
  let newslettertype;
  let newsletterSubs;
  if(typeof req.body.newsletter != 'undefined'){
    newsletterName = req.body.newsletter.name;
    newslettertype = req.body.newsletter.type;
    newsletterSubs = req.body.newsletter.subscribe;
  }
  const newsletterExisted = await userNewsletterModel.findByUserId(dbUserID);
  try {
    // Create a new user
    const result = userExisted && !!newsletterExisted && !!newsletterExisted.user_id
   ? await userNewsletterModel.updateByUserId(dbUserID, {
      name: newsletterName,
      type: newslettertype,
      subscribe: newsletterSubs
    })
    : await userNewsletterModel.create({
      user_id: dbUserID,
      name: newsletterName,
      type: newslettertype,
      subscribe: newsletterSubs
    });

    return result;

  } catch (error) {
    let catchError = new Error(`userSignupHelper.inserUserMembership error: ${error}`);
    console.log(catchError);
    return catchError;
  }
}
/**
 * Insert user's credential to DB
 *
 * @param {json} req
 * @param {str} dbUserID
 * @param {str} userSubIdFromCognito
 * @returns
 */
async function insertUserCredential(req, dbUserID, userSubIdFromCognito){
  // process credential data

  try {
    // Create a new user
    const result = await userCredentialModel.create({
      user_id: dbUserID,
      username: req.body.email, // cognito username is email
      password_hash: req.body.password,
      tokens: null,
      last_login: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user_sub_id: userSubIdFromCognito
    });

    return result;

  } catch (error) {
    let catchError = new Error(`userSignupHelper.insertUserMembership error: ${error}`);
    console.log(catchError);
    return catchError;
  }
}

/**
 * Insert user's detail to DB
 *
 * @param {json} req
 * @param {string} dbUserID
 * @returns
 */
async function insertUserDetail(req, dbUserID, userExisted){
  // process user detail
  try {
    // Create a new user
    const result = userExisted ? await userDetailModel.updateByUserId(dbUserID, {
      user_id: dbUserID,
      phone_number: req.body.phone ? req.body.phone : undefined,
      zoneinfo: req.body.zone ? req.body.zone : undefined,
      address: req.body.address ? req.body.address : undefined,
      picture: req.body.picture ? req.body.picture : undefined,
      vehicle_iu: req.body.vehicleIU ? req.body.vehicleIU : undefined,
      vehicle_plate: req.body.vehiclePlate ? req.body.vehiclePlate : undefined,
      extra: req.body.extra ? req.body.extra : undefined
    }) : await userDetailModel.create({
      user_id: dbUserID,
      phone_number: req.body.phone ? req.body.phone : null,
      zoneinfo: req.body.zone ? req.body.zone : null,
      address: req.body.address ? req.body.address : null,
      picture: req.body.picture ? req.body.picture : null,
      vehicle_iu: req.body.vehicleIU ? req.body.vehicleIU : null,
      vehicle_plate: req.body.vehiclePlate ? req.body.vehiclePlate : null,
      extra: req.body.extra ? req.body.extra : null
    });

    return result;

  } catch (error) {
    let catchError = new Error(`userSignupHelper.inserUserMembership error: ${error}`);
    console.log(catchError);
    return catchError;
  }
}

async function updateUserMigration(req, dbUserID){
  try {
    const sql = `
        UPDATE user_migrations
        SET
          user_id = ?,
          updated_at = NOW()
        WHERE email = ? AND batch_no = FROM_UNIXTIME(?)
      `;
    const params = [
      dbUserID,
      req.body.email,
      req.body.batchNo,
    ];
    await userMigrationsModel.runCustomSQL(sql, params);
  } catch (error) {
    console.log(new Error(`Update User Migrations user_id failed: ${error}`));
  }
}


async function signupMPWithUpdateIfExist(reqBody, userDBInfo, passwordCredential){
  // update user credential table, clear token & lastLogin for make sure the user re-signup for trigger first login
  let userCredentialData = {
    password_hash: reqBody.passwordHash ? reqBody.passwordHash : undefined,
    salt: reqBody.passwordSalt ? reqBody.passwordSalt : null,
    tokens: null,
    last_login: null
  };
  const userCredentialExistedUpdate = await userCredentialModel.updateByUserEmail(reqBody.email, userCredentialData);

  //reset cognito password if user is existed
  await cognitoService.cognitoAdminSetUserPassword(
      reqBody.email,
      passwordCredential.cognito.hashPassword
  );

  // update user table
  let userModelData = {
    given_name: reqBody.firstName ? reqBody.firstName : undefined,
    family_name: reqBody.lastName ? reqBody.lastName : undefined,
    birthdate: reqBody.dob ? convertDateToMySQLFormat(reqBody.dob) : null,
  };
  const userExistedUpdate = await userModel.update(userDBInfo.id, userModelData);

  // update user details table
  let userDetailData = {
    user_id: userDBInfo.id,
    phone_number: reqBody.phoneNumber ? reqBody.phoneNumber : null,
    zoneinfo: reqBody.country ? reqBody.country : null,
  };
  const userDetailExistedUpdate = await userDetailModel.upsert(userDetailData);

  if(userCredentialExistedUpdate.success && userExistedUpdate.success && userDetailExistedUpdate.success){
    return {success: true};
  }
}

async function updatePasswordCredential(email, passwordCredential) {
  const dataUpdated = {
    password_hash: passwordCredential.db.hashPassword,
    salt: passwordCredential.db.salt,
    tokens: null,
    last_login: null
  }

  await userCredentialModel.updateByUserEmail(email, dataUpdated);
}

module.exports = {
  generateMandaiID,
  generateVisualID,
  createUserSignupDB,
  insertUserMembership,
  insertUserNewletter,
  signupMPWithUpdateIfExist,
  updatePasswordCredential
};

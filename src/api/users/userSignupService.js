const crypto = require('crypto');
const cognitoService = require('../../services/cognitoService');
const { getOrCheck } = require('../../utils/cognitoAttributes');
const { getSource, getGroup, maskKeyRandomly } = require('../../utils/common');
const SignUpErrors = require('../../config/https/errors/signupErrors');
const passwordService = require('./userPasswordService');
const userModel = require('../../db/models/userModel');
const { getCurrentUTCTimestamp, convertDateToMySQLFormat } = require('../../utils/dateUtils');
const pool = require('../../db/connections/mysqlConn');
const CommonErrors = require('../../config/https/errors/commonErrors');
const commonService = require('../../services/commonService');
const failedJobsModel = require('../../db/models/failedJobsModel');
const userMigrationsModel = require('../../db/models/userMigrationsModel');
const loggerService = require('../../logs/logger');
const empMembershipUserAccountsModel = require('../../db/models/empMembershipUserAccountsModel');
const switchService = require('../../services/switchService');
const userEventAuditTrailService = require('./userEventAuditTrailService');
const userSignupHelper = require('./usersSignupHelper');

class UserSignupService {
  async isUserExistedInCognito(email) {
    try {
      return await cognitoService.cognitoAdminGetUserByEmail(email);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      const errorData = errorMessage.data && errorMessage.data.name ? errorMessage.data : '';
      if (errorData.name && errorData.name === 'UserNotFoundException') {
        return false;
      }
      if (errorMessage.status === 'failed') {
        throw new Error(JSON.stringify(CommonErrors.NotImplemented()));
      }
    }
  }

  generateMandaiId(req, counter = 0, salt = '') {
    const source = getSource(req.headers['mwg-app-id']);
    const groupKey = getGroup(req.body.group);
    const secret = process.env.USER_POOL_CLIENT_SECRET;
    if (!secret) throw new Error('Missing USER_POOL_CLIENT_SECRET');

    const payload = [
      groupKey,
      source.sourceKey,
      req.body.email,
      req.body.dob,
      req.body.firstName,
      req.body.lastName,
      counter,
      salt,
    ].join('|');

    // const hash = crypto
    //   .createHash('sha256')
    //   .update(`${req.body.email}${req.body.dob}${req.body.firstName}${req.body.lastName}`)
    //   .digest('hex');
    // const numbers = hash.replace(/\D/g, '');
    // return `M${groupKey}${source.sourceKey}${numbers.slice(0, 11)}`;
    const hex = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    // 10 digits for fowp/fomp, else 11
    const is10 = ['fowp', 'fomp'].includes(req.body.group);
    const k = is10 ? 10n : 11n;
    const mod = 10n ** k;

    const tail = (BigInt('0x' + hex) % mod).toString().padStart(Number(k), '0');

    return `M${groupKey}${source.sourceKey}${tail}`;
  }

  userModelExecution(userData) {
    const sql = `
      INSERT INTO users
      (email, given_name, family_name, birthdate, mandai_id, source, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userData.email,
      userData.given_name,
      userData.family_name,
      convertDateToMySQLFormat(userData.birthdate),
      userData.mandai_id,
      userData.source,
      userData.status,
      userData.created_at,
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userCredentialModelExecution(credentialData) {
    const sql = `
      INSERT INTO user_credentials
      (user_id, username, password_hash, salt, user_sub_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      credentialData.user_id,
      credentialData.username,
      credentialData.password_hash,
      credentialData.salt,
      credentialData.user_sub_id,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userNewsletterModelExecution(newsletterData) {
    const sql = `
      INSERT INTO user_newsletters
      (user_id, name, type, subscribe, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      newsletterData.user_id,
      newsletterData.name,
      newsletterData.type,
      newsletterData.subscribe,
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  userDetailModelExecution(detailData) {
    const sql = `
      INSERT INTO user_details
      (user_id, phone_number, zoneinfo, address, picture, vehicle_iu, vehicle_plate, extra, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      detailData.user_id,
      detailData.phone_number,
      detailData.zoneinfo,
      detailData.address,
      detailData.picture,
      detailData.vehicle_iu,
      detailData.vehicle_plate,
      JSON.stringify(detailData.extra),
      getCurrentUTCTimestamp(),
      getCurrentUTCTimestamp(),
    ];
    return commonService.replaceSqlPlaceholders(sql, params);
  }

  importUserInformation(userDB, req, hashPassword, salt, phoneNumber, userSubId) {
    return [
      req.body.newsletter && req.body.newsletter.name
        ? this.userNewsletterModelExecution({
            user_id: userDB.user_id,
            name: req.body.newsletter.name ? req.body.newsletter.name : '',
            type: req.body.newsletter.type ? req.body.newsletter.type : '',
            subscribe: req.body.newsletter && !!req.body.newsletter.subscribe,
          })
        : undefined,
      this.userCredentialModelExecution({
        user_id: userDB.user_id,
        username: req.body.email,
        password_hash: hashPassword,
        salt: salt,
        user_sub_id: userSubId,
      }),
      this.userDetailModelExecution({
        user_id: userDB.user_id,
        phone_number: phoneNumber ? phoneNumber : null,
        zoneinfo: req.body.country ? req.body.country : null,
        address: req.body.address ? req.body.address : null,
        picture: req.body.picture ? req.body.picture : null,
        vehicle_iu: req.body.vehicleIU ? req.body.vehicleIU : null,
        vehicle_plate: req.body.vehiclePlate ? req.body.vehiclePlate : null,
        extra: req.body.extra ? req.body.extra : null,
      }),
    ].filter((work) => !!work);
  }

  async saveUserDB({ req, phoneNumber, mandaiId, hashPassword, saltPassword, userSubId }) {
    const source = getSource(req.headers['mwg-app-id']);

    let userDB = null;
    try {
      userDB = await userModel.create({
        email: req.body.email,
        given_name: req.body.firstName ? req.body.firstName.trim() : '',
        family_name: req.body.lastName ? req.body.lastName.trim() : '',
        birthdate: req.body.dob || null,
        mandai_id: mandaiId,
        source: source.sourceDB,
        status: 1,
        created_at: getCurrentUTCTimestamp(),
      });
    } catch (error) {
      console.log(error);
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: 'failedCreateNewUser',
        action: 'failed',
        data: this.userModelExecution({
          email: req.body.email,
          given_name: req.body.firstName ? req.body.firstName.trim() : '',
          family_name: req.body.lastName ? req.body.lastName.trim() : '',
          birthdate: req.body.dob || null,
          mandai_id: mandaiId,
          source: source.sourceDB,
          status: 1,
          created_at: getCurrentUTCTimestamp(),
        }),
        source: 2,
        triggered_at: null,
        status: 0,
      });
    }

    if (userDB && userDB.user_id) {
      !!req.body.migrations &&
        (await userMigrationsModel.updateMembershipUserAccounts(
          req.body.email,
          req.body.batchNo,
          userDB.user_id,
        ));

      try {
        await pool.transaction(
          this.importUserInformation(
            userDB,
            req,
            hashPassword,
            saltPassword,
            phoneNumber,
            userSubId,
          ),
        );
        this.loggerWrapper('[CIAM] End saveUserDB at Signup Service - Success', {
          layer: 'userSignupService.signup',
          action: 'adminCreateMPUser.saveUserDB',
          phoneNumber,
          mandaiId,
        });
      } catch (error) {
        this.loggerWrapper(
          '[CIAM] End saveUserDB at Signup Service - Failed',
          {
            layer: 'userSignupService.signup',
            action: 'adminCreateMPUser.saveUserDB',
            email: req.body.email,
            error: new Error(error),
            phoneNumber,
            mandaiId,
            hashPassword: maskKeyRandomly(hashPassword),
            saltPassword: maskKeyRandomly(saltPassword),
          },
          'error',
        );
        await failedJobsModel.create({
          uuid: crypto.randomUUID(),
          name: 'failedCreateNewUserInformation',
          action: 'failed',
          data: this.importUserInformation(userDB, req, hashPassword, saltPassword).join('|'),
          source: 2,
          triggered_at: null,
          status: 0,
        });
      }
    }
  }

  generateNewsletter(req) {
    if (!!req.body.migrations && req.body.newsletter === 1) {
      return {
        name: 'membership',
        type: '1',
        subscribe: req.body.newsletter && !!req.body.newsletter.subscribe,
      };
    }
    return req.body && req.body.newsletter && req.body.newsletter.name
      ? {
          name: 'membership',
          type: '1',
          subscribe: req.body.newsletter && !!req.body.newsletter.subscribe,
        }
      : null;
  }

  async preparePassword(req) {
    if (req.body.migrations || req.body.is_passwordless) {
      const saltPassword = req.body.passwordSalt
        ? req.body.passwordSalt
        : passwordService.createSaltKey(5);
      const passwordTemporary = crypto.randomUUID();
      const hashPassword = req.body.passwordHash
        ? req.body.passwordHash
        : passwordService.createPassword(passwordTemporary, saltPassword);

      return {
        db: {
          hashPassword: hashPassword,
          salt: saltPassword,
        },
        cognito: {
          hashPassword:
            !!req.body.passwordSalt && !!req.body.passwordHash
              ? `${req.body.passwordHash}${req.body.passwordSalt}Ma6@`.trim()
              : `${hashPassword}CiAm`,
          salt: null,
        },
      };
    }
    const hashPassword = await passwordService.hashPassword(req.body.password.toString());
    return {
      db: {
        hashPassword: hashPassword,
        salt: null,
      },
      cognito: {
        hashPassword: req.body.password,
        salt: null,
      },
    };
  }

  /**
   * Signup user to MP account for an existing wildpass
   * it can happen with normal signup flow + migration flow
   *
   * @param {*} req
   * @param {*} userCognito
   * @param {*} userDB
   * @param {*} passwordCredential
   * @returns
   */
  async handleUpdateUserBelongWildPass(req, userCognito, userDB, passwordCredential) {
    try {
      await cognitoService.cognitoAdminSetUserPassword(
        req.body.email,
        passwordCredential.cognito.hashPassword,
      );

      await userSignupHelper.updatePasswordCredential(req.body.email, passwordCredential);

      await cognitoService.cognitoAdminAddUserToGroup(req.body.email, req.body.group);

      const firstNameDB = userDB.given_name || '';
      const lastNameDB = userDB.family_name || '';
      const dobCognito = getOrCheck(userCognito, 'birthdate') || null;
      const isTriggerUpdateInfo =
        firstNameDB !== req.body.firstName ||
        lastNameDB !== req.body.lastName ||
        (req.body.dob && dobCognito !== req.body.dob);

      if (isTriggerUpdateInfo) {
        await userModel.update(userDB.id, {
          given_name: req.body.firstName || undefined,
          family_name: req.body.lastName || undefined,
          birthdate: req.body.dob ? convertDateToMySQLFormat(req.body.dob) : undefined,
        });
        let userName = getOrCheck(userCognito, 'name');
        const userFirstName = getOrCheck(userCognito, 'given_name');
        const userLastName = getOrCheck(userCognito, 'family_name');

        if (req.body.firstName && userFirstName) {
          userName = userName.replace(userFirstName.toString(), req.body.firstName);
        }

        if (req.body.firstName && userLastName) {
          userName = userName.replace(userLastName.toString(), req.body.firstName);
        }
        await cognitoService.cognitoAdminUpdateNewUser(
          [
            {
              Name: 'given_name',
              Value: req.body.firstName,
            },
            {
              Name: 'family_name',
              Value: req.body.lastName,
            },
            {
              Name: 'name',
              Value: userName,
            },
          ],
          req.body.email,
        );
      }

      const mandaiId = getOrCheck(userCognito, 'custom:mandai_id');
      !!req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 1,
        }));
      this.loggerWrapper('[CIAM] End handleUpdateUserBelongWildPass Service - Success', {
        layer: 'userSignupService.signup',
        action: 'adminCreateMPUser.handleUpdateUserBelongWildPass',
        email: req.body.email,
        mandaiId,
      });
      return { mandaiId };
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End handleUpdateUserBelongWildPass Service - Failed',
        {
          layer: 'userSignupService.signup',
          action: 'adminCreateMPUser.handleUpdateUserBelongWildPass',
          email: req.body.email,
          userCognito: userCognito,
          userDB: userDB,
          error: new Error(`User is signup failed with case existed at Cognito! - ${error}`),
        },
        'error',
      );
      req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 3,
        }));
      throw new Error(JSON.stringify(SignUpErrors.ciamEmailExists(req.body.language)));
    }
  }

  /**
   * Membership Passes signup request
   *
   * @param {JSON} req
   * @returns
   */
  async signup(req) {
    loggerService.log(
      {
        user: {
          membership: req.body.group,
          action: 'adminCreateNewUser',
          api_header: req.headers,
          api_body: req.body,
          layer: 'userSignupService.signup',
        },
      },
      '[CIAM] Start Signup with FOs Service',
    );

    // get switches from DB
    const dbSwitch = await switchService.getAllSwitches();

    //prepare password information dynamic by migrations flag
    const passwordCredential = await this.preparePassword(req);

    //check user exists
    const userInfo = await userModel.findByEmail(req.body.email);
    const userExistedInCognito = await this.isUserExistedInCognito(req.body.email, userInfo);

    // generate phoneNumber dynamic by migrations flag
    const phoneNumber = commonService.cleanPhoneNumber(req.body.phoneNumber);
    req.body.phoneNumber = phoneNumber;

    // generate Mandai ID
    let idCounter = 0;
    let mandaiId = this.generateMandaiId(req, idCounter);
    if (await userModel.existsByMandaiId?.(mandaiId)) {
      loggerService.log({ mandaiId }, '[CIAM] MandaiId Duplicated');
      // try a few counters to find a free one before hitting Cognito/DB
      let found = false;
      for (let c = 1; c <= 5; c++) {
        const tryId = this.generateMandaiId(req, c);
        loggerService.log({ mandaiId, tryId, counter: c }, '[CIAM] New MandaiId generated');

        if (!(await userModel.existsByMandaiId(tryId))) {
          mandaiId = tryId;
          found = true;
          idCounter = c;
          break;
        }
      }
      if (!found) {
        throw new Error('Could not reserve a unique Mandai ID');
      }
    }

    // if user exist MP group
    if (userExistedInCognito && getOrCheck(userExistedInCognito, 'custom:mandai_id')) {
      // check is user email existed at wildpass userCognito
      const userBelongWildpassGroup = await cognitoService.checkUserBelongOnlyWildpass(
        req.body.email,
        userExistedInCognito,
      );

      const userInfo = await userModel.findByEmail(req.body.email);
      if (userInfo && userInfo.email && userBelongWildpassGroup) {
        return await this.handleUpdateUserBelongWildPass(
          req,
          userExistedInCognito,
          userInfo,
          passwordCredential,
        );
      }

      if (req.body.migrations) {
        // if migration signup user exist then update 'switch' turned on
        const updateIfMigrationSwitch = await switchService.findSwitchValue(
          dbSwitch,
          'migration_update_existing_user',
        );

        if (updateIfMigrationSwitch && updateIfMigrationSwitch === true) {
          // update membership pass user
          let update = await userSignupHelper.signupMPWithUpdateIfExist(
            req.body,
            userInfo,
            passwordCredential,
          );
          if (update.success) {
            await empMembershipUserAccountsModel.updateByEmail(req.body.email, { picked: 1 });
            return { mandaiId };
          }
        }
        // perform update migration user membership account if migrations exist
        await empMembershipUserAccountsModel.updateByEmail(req.body.email, { picked: 3 });
      }
      this.loggerWrapper(
        '[CIAM] End Signup with FOs Service - Failed',
        {
          layer: 'userSignupService.signup',
          action: 'adminCreateMPUser',
          email: userInfo.email,
          error: 'User is signup failed with email case sensitive existed at Cognito!',
        },
        'error',
      );
      throw new Error(JSON.stringify(SignUpErrors.ciamEmailExists(req.body.language)));
    }

    //cover for case email sensitive at Cognito have chance that email capitalize
    if (userInfo && userInfo.email) {
      this.loggerWrapper(
        '[CIAM] End Signup with FOs Service - Failed',
        {
          layer: 'userSignupService.signup',
          action: 'adminCreateMPUser',
          email: userInfo.email,
          error: 'User is already exists at DB!',
        },
        'error',
      );
      throw new Error(JSON.stringify(SignUpErrors.ciamEmailExists(req.body.language)));
    }

    try {
      //generate newsletter dynamic by migrations flag
      const newsletterMapping = this.generateNewsletter(req);

      let cognitoData = {
        email: req.body.email,
        firstName: req.body.firstName ? req.body.firstName.trim() : '',
        lastName: req.body.lastName ? req.body.lastName.trim() : '',
        birthdate: req.body.dob || '',
        address: req.body.address || '',
        country: req.body.country || '',
        mandaiId,
        newsletter: newsletterMapping,
        source: getSource(req.headers['mwg-app-id']).source
          ? getSource(req.headers['mwg-app-id']).source
          : '',
      };

      // Only add phoneNumber if it has a meaningful value (not null, undefined, empty string, or just whitespace)
      if (phoneNumber !== null && phoneNumber !== undefined && phoneNumber.trim() !== '') {
        cognitoData.phoneNumber = phoneNumber;
      }
      const cognitoInfo = await cognitoService.cognitoAdminCreateUser(cognitoData);

      // set user password in cognito
      await cognitoService.cognitoAdminSetUserPassword(
        req.body.email,
        passwordCredential.cognito.hashPassword,
      );

      // set user into cognito group
      await cognitoService.cognitoAdminAddUserToGroup(req.body.email, req.body.group);

      //update picked = 1 in emp_membership+user_accounts tbl
      !!req.body &&
        !!req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, { picked: 1 }));

      const TRY_LIMIT = 6;
      for (let counter = 0; counter < TRY_LIMIT; counter++) {
        try {
          await this.saveUserDB({
            req,
            phoneNumber: phoneNumber || '',
            mandaiId,
            hashPassword: passwordCredential.db.hashPassword || '',
            saltPassword: passwordCredential.db.salt || '',
            userSubId: cognitoInfo.User.Username || null,
          });
          break; // success
        } catch (e) {
          if (!this.isMandaiIdDupError(e) || counter === TRY_LIMIT - 1) throw e;

          // Compute a new ID and keep Cognito in sync
          idCounter += 1;
          const salt = crypto.randomUUID();
          const newId = this.generateMandaiId(req, idCounter, salt);

          const updateParams = [
            {
              Name: 'custom:mandai_id',
              Value: newId,
            },
          ];
          // Update Cognito custom attribute to the new ID
          await cognitoService.cognitoAdminUpdateNewUser(updateParams, req.body.email);
          mandaiId = newId; // try DB again with the new ID
        }
      }
      this.loggerWrapper('[CIAM] End Signup with FOs Service - Success', {
        layer: 'userSignupService.signup',
        action: 'adminCreateMPUser',
        cognitoCreated: JSON.stringify(cognitoInfo),
        mandaiId,
      });
      await userEventAuditTrailService.createEvent(
        req.body.email,
        'success',
        'signup',
        req.body,
        1,
        mandaiId,
      );
      return {
        mandaiId,
      };
    } catch (error) {
      this.loggerWrapper(
        '[CIAM] End Signup with FOs Service - Failed',
        {
          layer: 'userSignupService.signup',
          action: 'adminCreateMPUser',
          error: new Error(error),
          membership: req.body.group,
          body: JSON.stringify(req.body),
        },
        'error',
      );
      await userEventAuditTrailService.createEvent(
        req.body.email,
        'failed',
        'signup',
        {
          ...req.body,
          error: JSON.stringify(error),
        },
        1,
      );
      req.body.migrations &&
        (await empMembershipUserAccountsModel.updateByEmail(req.body.email, {
          picked: 2,
        }));
      const errorMessage = error && error.message ? JSON.parse(error.message) : '';
      if (
        errorMessage &&
        errorMessage.rawError &&
        errorMessage.rawError.includes('Invalid phone number format.')
      ) {
        throw new Error(
          JSON.stringify(
            CommonErrors.BadRequest('phoneNumber', 'phoneNumber_invalid', req.body.language),
          ),
        );
      }
      if (errorMessage.status === 'failed') {
        throw new Error(JSON.stringify(SignUpErrors.ciamSignUpErr(req.body.language)));
      }
      throw new Error(JSON.stringify(CommonErrors.NotImplemented()));
    }
  }

  isMandaiIdDupError(err) {
    return (
      err &&
      (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) &&
      /mandai_id/i.test(err.sqlMessage || err.message || '')
    );
  }

  loggerWrapper(action, loggerObj, type = 'logInfo') {
    if (type === 'error') {
      return loggerService.error({ userSignupService: { ...loggerObj } }, {}, action);
    }

    return loggerService.log({ userSignupService: { ...loggerObj } }, action);
  }
}

module.exports = new UserSignupService();

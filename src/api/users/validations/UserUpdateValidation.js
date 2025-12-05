const { validateDOB } = require('../../../services/validationService');
const CommonErrors = require('../../../config/https/errors/commonErrors');
const emailDomainService = require('../../../services/emailDomainsService');
const userCredentialModel = require('../../../db/models/userCredentialModel');
const passwordService = require('../userPasswordService');
const UserPasswordVersionService = require('../userPasswordVersionService');
const argon2 = require('argon2');
const { switchIsTurnOn } = require('../../../helpers/dbSwitchesHelpers');
const { checkPasswordHasValidPattern } = require('../helpers/checkPasswordComplexityHelper');
const cognitoService = require('../../../services/cognitoService');
const crypto = require('crypto');
const { secrets } = require('../../../services/secretsService');
const { validateOtpEmailDisabledUntil } = require('../helpers/otpEmailHelper');

class UserUpdateValidation {
  constructor() {
    this.error = null;
  }

  static execute(req) {
    return this.validateRequestParams(req);
  }

  //return true/false
  static async verifyPassword(userCredential, password) {
    //check by password salt - from migration always have salt
    let isSamePassword = false;
    if (
      userCredential &&
      userCredential.salt &&
      !userCredential.password_hash.startsWith('$argon2')
    ) {
      //cover for case hash_password salt generate by CIAM with old user
      //more than 8 character is hash generate by CIAM - CIAM generate hash automatically
      if (userCredential.password_hash.length > 8) {
        //when update password success -> the password_hash will always $argon2 it mean this func will only run once.
        try {
          const ciamSecrets = await secrets.getSecrets('ciam-microservice-lambda-config');
          const loginSession = await cognitoService.cognitoUserLogin(
            {
              email: userCredential.username,
              password: password,
            },
            crypto
              .createHmac('sha256', ciamSecrets.USER_POOL_CLIENT_SECRET)
              .update(`${userCredential.username}${ciamSecrets.USER_POOL_CLIENT_ID}`)
              .digest('base64'),
          );
          isSamePassword = !!loginSession && !!loginSession.accessToken;
        } catch {
          isSamePassword = false;
        }
      }
      if (isSamePassword) {
        return isSamePassword;
      }
      return (
        passwordService.createPassword(password, userCredential.salt).toUpperCase() ===
        userCredential.password_hash.toUpperCase()
      );
    }
    //check by password argon2 with normal flow
    return await argon2.verify(userCredential.password_hash, password);
  }

  //enhance get list error
  static async validateRequestParams(req) {
    const privateMode = !!req.privateMode;

    // Validate otpEmailDisabledUntil if present - use helper function for consistency
    if (req.otpEmailDisabledUntil !== undefined) {
      const validationError = validateOtpEmailDisabledUntil(req.otpEmailDisabledUntil, req.language);
      if (validationError) {
        return (this.error = validationError);
      }
    }

    if (req.otpEmailDisabledUntil === undefined && ((req.data && Object.keys(req.data).length === 0) || !req.data)) {
      return (this.error = CommonErrors.RequestIsEmptyErr(req.language));
    }

    if (req.otpEmailDisabledUntil !== undefined && ((req.data && Object.keys(req.data).length === 0) || !req.data)) {
      // return null to skip validation for other fields when only otpEmailDisabledUntil is present
      return (this.error = null);
    }

    const bodyData = req.data;

    //validate missing required params
    const paramsShouldNotEmpty = [
      'newEmail',
      'firstName',
      'lastName',
      'country',
      // "phoneNumber", //disabled for now
      'newPassword',
      'confirmPassword',
      'oldPassword',
      'address',
    ];
    const listKeys = Object.keys(bodyData);
    //if parameters have some empty string
    const paramsInvalid = paramsShouldNotEmpty
      .filter((key) => listKeys.includes(key))
      .filter((ele) => bodyData[`${ele}`].trim() === '');

    if (paramsInvalid.length) {
      return (this.error = CommonErrors.BadRequest(
        paramsInvalid[0],
        `${paramsInvalid[0]}_invalid`,
        req.language,
      ));
    }

    if (bodyData.newEmail && !emailDomainService.isValidEmailFormat(bodyData.newEmail)) {
      return (this.error = CommonErrors.BadRequest('newEmail', 'newEmail_invalid', req.language));
    }

    // check email domain switch turned on ( 1 ) if email format is passed
    if (bodyData.newEmail && emailDomainService.isValidEmailFormat(bodyData.newEmail)) {
      if ((await emailDomainService.getCheckDomainSwitch()) === true) {
        // validate email domain to DB
        let validDomain = await emailDomainService.validateEmailDomain(bodyData.newEmail);
        if (!validDomain) {
          return (this.error = CommonErrors.BadRequest(
            'newEmail',
            'newEmail_invalid',
            req.language,
          ));
        }
      }
    }

    if (bodyData.dob || bodyData.dob === '') {
      const dob = validateDOB(bodyData.dob);
      if (!dob) {
        return (this.error = CommonErrors.BadRequest('dob', 'dob_invalid', req.language));
      }
    }
    if (bodyData.country && bodyData.country.length !== 2) {
      return (this.error = CommonErrors.BadRequest('country', 'country_invalid', req.language));
    }
    if (
      bodyData.newsletter &&
      bodyData.newsletter.name &&
      !['wildpass', 'membership'].includes(bodyData.newsletter.name)
    ) {
      return (this.error = CommonErrors.BadRequest(
        'newsletter',
        'newsletter_invalid',
        req.language,
      ));
    }
    if (
      bodyData.newPassword ||
      bodyData.confirmPassword ||
      bodyData.oldPassword ||
      bodyData.password
    ) {
      //checking with private endpoint
      if (privateMode) {
        if (bodyData.confirmPassword && !bodyData.password) {
          return (this.error = CommonErrors.BadRequest(
            'password',
            'newPassword_required',
            req.language,
          ));
        }
        if (bodyData.password && !bodyData.confirmPassword) {
          return (this.error = CommonErrors.BadRequest(
            'confirmPassword',
            'confirmPassword_required',
            req.language,
          ));
        }
        if (bodyData.password) {
          const passwordCorrectFormat = await checkPasswordHasValidPattern(
            bodyData.password,
            'enable_check_password_complexity_private_endpoint',
          );
          if (!passwordCorrectFormat) {
            return (this.error = CommonErrors.PasswordErr(req.language));
          }

          if (bodyData.password !== bodyData.confirmPassword) {
            return (this.error = CommonErrors.PasswordNotMatch(req.language));
          }

          const userCredential = await userCredentialModel.findByUserEmail(req.email);
          //verify with password version
          const enablePasswordVersionChecking = await switchIsTurnOn(
            'enable_password_versioning_private_endpoint',
          );
          if (enablePasswordVersionChecking) {
            const newPasswordHadMarkedVersion =
              await UserPasswordVersionService.passwordValidProcessing(
                userCredential.user_id,
                bodyData.password,
              );
            if (newPasswordHadMarkedVersion) {
              return (this.error = CommonErrors.sameOldPasswordException(req.language));
            }
          }
        }
        return (this.error = null);
      }

      if (!bodyData.oldPassword) {
        return (this.error = CommonErrors.BadRequest(
          'oldPassword',
          'oldPassword_required',
          req.language,
        ));
      }
      if (!bodyData.newPassword) {
        return (this.error = CommonErrors.BadRequest(
          'newPassword',
          'newPassword_required',
          req.language,
        ));
      }
      if (!bodyData.confirmPassword) {
        return (this.error = CommonErrors.BadRequest(
          'confirmPassword',
          'confirmPassword_required',
          req.language,
        ));
      }
      if (bodyData.newPassword) {
        const passwordCorrectFormat = await checkPasswordHasValidPattern(
          bodyData.newPassword,
          'enable_check_password_complexity',
        );
        if (!passwordCorrectFormat) {
          return (this.error = CommonErrors.PasswordErr(req.language));
        }

        if (bodyData.newPassword !== bodyData.confirmPassword) {
          return (this.error = CommonErrors.PasswordNotMatch(req.language));
        }

        //verify old password is not match
        let oldPasswordIsSame = false;
        const userCredential = await userCredentialModel.findByUserEmail(req.email);

        if (bodyData.oldPassword) {
          oldPasswordIsSame = await this.verifyPassword(userCredential, bodyData.oldPassword);
        }
        if (!oldPasswordIsSame) {
          return (this.error = CommonErrors.OldPasswordNotMatchErr(req.language));
        }

        //verify new password is same with old password
        if (bodyData.oldPassword && bodyData.oldPassword === bodyData.newPassword) {
          return (this.error = CommonErrors.sameOldPasswordException(req.language));
        }

        //verify with password version
        const enablePasswordVersionChecking = await switchIsTurnOn('enable_password_versioning');
        if (enablePasswordVersionChecking) {
          const newPasswordHadMarkedVersion =
            await UserPasswordVersionService.passwordValidProcessing(
              userCredential.user_id,
              bodyData.newPassword,
            );
          if (newPasswordHadMarkedVersion) {
            return (this.error = CommonErrors.sameOldPasswordException(req.language));
          }
        }
      }
    }
    return (this.error = null);
  }
}

module.exports = UserUpdateValidation;

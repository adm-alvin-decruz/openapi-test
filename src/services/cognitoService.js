const {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AdminUserGlobalSignOutCommand,
  AdminGetUserCommand,
  GetUserCommand,
  AdminDeleteUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  ChangePasswordCommand,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const passwordService = require("../api/users/userPasswordService");
const loggerService = require("../logs/logger");
const { maskKeyRandomly } = require("../utils/common");
const crypto = require("crypto");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });
const cognitoAttribute = require("../utils/cognitoAttributes");
const { GROUP } = require("../utils/constants");
const configsModel = require("../db/models/configsModel");
const { getCiamSecrets } = require("./secretsService");

const ciamSecrets = getCiamSecrets();

class Cognito {
  constructor() {
    this.clientId = ciamSecrets.USER_POOL_CLIENT_ID;
    this.clientSecret = ciamSecrets.USER_POOL_CLIENT_SECRET;
  }

  static async cognitoAdminUpdateUser(req, ciamComparedParams) {
    req["apiTimer"] = req.processTimer.apiRequestTimer();
    req.apiTimer.log("cognitoAdminUpdateUser"); // log process time
    const result = [];
    // prepare update user array
    const updateUserArray = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: req.body.email,
      UserAttributes: ciamComparedParams,
    };
    result["cognitoUpdateArr"] = JSON.stringify(updateUserArray);
    const setUpdateParams = new AdminUpdateUserAttributesCommand(updateUserArray);

    try {
      result["cognitoUpdateResult"] = JSON.stringify(client.send(setUpdateParams));
    } catch (error) {
      result["cognitoUpdateError"] = JSON.stringify(error);
    }
    req.apiTimer.end("cognitoAdminUpdateUser"); // log end time
    return result;
  }

  static async cognitoUserLogin({ email, password }, hashSecret) {
    const userLoginParams = new AdminInitiateAuthCommand({
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: this.clientId,
      AuthParameters: {
        SECRET_HASH: hashSecret,
        USERNAME: email,
        PASSWORD: password,
      },
    });

    loggerService.log(
      {
        cognitoService: {
          email,
          password: maskKeyRandomly(password),
          hashSecret: maskKeyRandomly(hashSecret),
          action: "cognitoUserLogin",
          layer: "services.cognitoService",
        },
      },
      "[CIAM] Start cognitoUserLogin Service"
    );

    try {
      const loginSession = await client.send(userLoginParams);
      loggerService.log(
        {
          cognitoService: {
            email,
            password: maskKeyRandomly(password),
            hashSecret: maskKeyRandomly(hashSecret),
            action: "cognitoUserLogin",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoUserLogin Service - Success"
      );
      return {
        accessToken: loginSession.AuthenticationResult.AccessToken,
        refreshToken: loginSession.AuthenticationResult.RefreshToken,
        idToken: loginSession.AuthenticationResult.IdToken,
      };
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            email,
            password: maskKeyRandomly(password),
            hashSecret: maskKeyRandomly(hashSecret),
            action: "cognitoUserLogin",
            layer: "services.cognitoService",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] End cognitoUserLogin Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoUserLogout(username) {
    try {
      const userLogout = new AdminUserGlobalSignOutCommand({
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
      });
      loggerService.log(
        {
          cognitoService: {
            username,
            action: "cognitoUserLogout",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoUserLogout Service"
      );
      await client.send(userLogout);
      loggerService.log(
        {
          cognitoService: {
            username,
            action: "cognitoUserLogout",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoUserLogout Service - Success"
      );
      return {
        message: "success",
      };
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            username,
            action: "cognitoUserLogout",
            layer: "services.cognitoService",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] End cognitoUserLogout Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoAdminGetUserByEmail(email) {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
    });

    loggerService.log(
      {
        cognitoService: {
          email: email,
          CognitoGetUserResult: getUserCommand,
          action: "cognitoAdminGetUserByEmail",
          layer: "services.cognitoService",
        },
      },
      "[CIAM] Start cognitoAdminGetUserByEmail Service"
    );

    try {
      const userInfo = await client.send(getUserCommand);
      loggerService.log(
        {
          cognitoService: {
            email: email,
            userInfo: JSON.stringify(userInfo),
            action: "cognitoAdminGetUserByEmail",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoAdminGetUserByEmail Service - Success"
      );
      return userInfo;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            email: email,
            CognitoGetUserResult: getUserCommand,
            action: "cognitoAdminGetUserByEmail",
            layer: "services.cognitoService",
            error: new Error(error.message),
          },
        },
        {},
        "[CIAM] End cognitoAdminGetUserByEmail Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoAdminGetUserByAccessToken(token) {
    const getUserCommand = new GetUserCommand({
      AccessToken: token,
    });

    try {
      loggerService.log(
        {
          cognitoService: {
            token: maskKeyRandomly(token),
            action: "cognitoAdminGetUserByAccessToken",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminGetUserByAccessToken Service"
      );
      const rs = await client.send(getUserCommand);
      loggerService.log(
        {
          cognitoService: {
            response: `${rs}`,
            action: "cognitoAdminGetUserByAccessToken",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoAdminGetUserByAccessToken Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            token: maskKeyRandomly(token),
            action: "cognitoAdminGetUserByAccessToken",
            layer: "services.cognitoService",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] End cognitoAdminGetUserByAccessToken Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
          rawError: error.toString(),
        })
      );
    }
  }

  static async cognitoAdminListGroupsForUser(email) {
    const groupsBelongUserCommand = new AdminListGroupsForUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
    });

    loggerService.log(
      {
        cognitoService: {
          email,
          cognitoCommand: JSON.stringify(groupsBelongUserCommand),
          action: "cognitoAdminListGroupsForUser",
          layer: "services.cognitoService",
        },
      },
      "[CIAM] Start cognitoAdminListGroupsForUser Service"
    );

    try {
      const groups = await client.send(groupsBelongUserCommand);
      loggerService.log(
        {
          cognitoService: {
            email,
            response: JSON.stringify(groups),
            action: "cognitoAdminListGroupsForUser",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoAdminListGroupsForUser Service - Success"
      );
      return groups;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            email,
            action: "cognitoAdminListGroupsForUser",
            layer: "services.cognitoService",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] End cognitoAdminListGroupsForUser Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoAdminCreateUser(data) {
    const newUserArray = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: data.email,
      TemporaryPassword: passwordService.generatePassword(8),
      DesiredDeliveryMediums: ["EMAIL"],
      MessageAction: "SUPPRESS", // disable send verification email temp password
      UserAttributes: [
        { Name: "email_verified", Value: "true" },
        { Name: "given_name", Value: data.firstName },
        { Name: "family_name", Value: data.lastName },
        { Name: "preferred_username", Value: data.email },
        { Name: "name", Value: `${data.firstName} ${data.lastName}` },
        { Name: "email", Value: data.email },
        { Name: "birthdate", Value: data.birthdate },
        { Name: "address", Value: data.address },
        { Name: "phone_number", Value: data.phoneNumber || "" },
        { Name: "zoneinfo", Value: data.country },
        { Name: "custom:mandai_id", Value: data.mandaiId },
        { Name: "custom:newsletter", Value: JSON.stringify(data.newsletter) },
        { Name: "custom:terms_conditions", Value: "null" },
        { Name: "custom:visual_id", Value: "null" },
        { Name: "custom:vehicle_iu", Value: "null" },
        { Name: "custom:vehicle_plate", Value: "null" },
        { Name: "custom:last_login", Value: "null" },
        { Name: "custom:source", Value: data.source },
      ],
    };

    try {
      const newUserParams = new AdminCreateUserCommand(newUserArray);
      loggerService.log(
        {
          cognitoService: {
            data: JSON.stringify(data),
            params: JSON.stringify(newUserArray.UserAttributes),
            action: "cognitoAdminCreateUser",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminCreateUser Service"
      );
      const rs = await client.send(newUserParams);
      loggerService.log(
        {
          cognitoService: {
            action: "cognitoAdminCreateUser",
            layer: "services.cognitoService",
            response: `${rs}`,
          },
        },
        "[CIAM] End cognitoAdminCreateUser Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.log(
        {
          cognitoService: {
            email: data.email,
            params: `${newUserArray.UserAttributes}`,
            action: "cognitoAdminCreateUser",
            layer: "cognitoService.cognitoAdminCreateUser",
            error: `${error}`,
            errorTrace: new Error("cognitoService.cognitoAdminCreateUser error", error),
          },
        },
        {},
        "[CIAM] End cognitoAdminCreateUser Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
          rawError: error.toString(),
        })
      );
    }
  }

  static async cognitoAdminSetUserPassword(email, password) {
    const setPasswordParams = new AdminSetUserPasswordCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    });
    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            password: maskKeyRandomly(password),
            action: "cognitoAdminSetUserPassword",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminSetUserPassword Service"
      );
      const rs = await client.send(setPasswordParams);
      loggerService.log(
        {
          cognitoService: {
            email,
            action: "cognitoAdminSetUserPassword",
            layer: "services.cognitoService",
            response: JSON.stringify(rs),
          },
        },
        "[CIAM] End cognitoAdminSetUserPassword Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            email,
            password: maskKeyRandomly(password),
            action: "cognitoAdminSetUserPassword",
            layer: "services.cognitoService",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] End cognitoAdminSetUserPassword Service - Failed"
      );
    }
  }

  static async cognitoAdminDeleteUser(email) {
    const setDeleteUserParams = new AdminDeleteUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
    });
    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            action: "cognitoAdminDeleteUser",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminDeleteUser Service - Success"
      );
      const rs = await client.send(setDeleteUserParams);
      loggerService.log(
        {
          cognitoService: {
            email,
            action: "cognitoAdminDeleteUser",
            layer: "services.cognitoService",
            response: `${rs}`,
          },
        },
        "[CIAM] End cognitoAdminDeleteUser Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            email,
            action: "cognitoAdminDeleteUser",
            layer: "services.cognitoService",
            error: `${error}`,
          },
        },
        {},
        "[CIAM] End cognitoAdminDeleteUser Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoAdminUpdateNewUser(params, email) {
    const userUpdateParams = new AdminUpdateUserAttributesCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      UserAttributes: params,
    });

    loggerService.log(
      {
        cognitoService: {
          email: email,
          params: JSON.stringify(params),
          action: "cognitoAdminUpdateNewUser",
          layer: "cognitoService",
        },
      },
      "[CIAM] Start cognitoAdminUpdateNewUser Service"
    );
    try {
      const rs = await client.send(userUpdateParams);
      loggerService.log(
        {
          cognitoService: {
            email,
            response: JSON.stringify(rs),
            action: "cognitoAdminUpdateNewUser",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoAdminUpdateNewUser Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            email: email,
            params: JSON.stringify(params),
            action: "cognitoAdminUpdateNewUser",
            layer: "services.cognitoService",
            error: new Error("cognitoAdminUpdateNewUser error", error),
          },
        },
        {},
        "[CIAM] End cognitoAdminUpdateNewUser Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
          rawError: error.toString(),
        })
      );
    }
  }

  static async cognitoUserChangePassword(accessToken, password, oldPassword) {
    loggerService.log(
      {
        cognitoService: {
          action: "cognitoUserChangePassword",
          layer: "services.cognitoService",
          accessToken: maskKeyRandomly(accessToken),
          password: maskKeyRandomly(password),
          oldPassword: maskKeyRandomly(oldPassword),
        },
      },
      "[CIAM] Start cognitoUserChangePassword Service - Success"
    );

    let passwordData = {
      AccessToken: accessToken,
      ProposedPassword: password,
      PreviousPassword: oldPassword,
    };
    const userChangePassword = new ChangePasswordCommand(passwordData);
    try {
      const rs = await client.send(userChangePassword);
      loggerService.log(
        {
          cognitoService: {
            response: `${rs}`,
            action: "cognitoUserChangePassword",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoUserChangePassword Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            action: "cognitoUserChangePassword",
            layer: "services.cognitoService",
            error: `${error}`,
            accessToken: maskKeyRandomly(accessToken),
            password: maskKeyRandomly(password),
            oldPassword: maskKeyRandomly(oldPassword),
          },
        },
        {},
        "[CIAM] End cognitoUserChangePassword Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoAdminAddUserToGroup(email, group) {
    const adminAddUserToGroup = new AdminAddUserToGroupCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      GroupName: group,
    });
    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            group,
            action: "cognitoAdminAddUserToGroup",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminAddUserToGroup Service"
      );
      const rs = await client.send(adminAddUserToGroup);
      loggerService.log(
        {
          cognitoService: {
            response: JSON.stringify(rs),
            action: "cognitoAdminAddUserToGroup",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] End cognitoAdminAddUserToGroup Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            action: "cognitoAdminAddUserToGroup",
            layer: "services.cognitoService",
            error: `${error}`,
            email,
            group,
          },
        },
        {},
        "[CIAM] End cognitoAdminAddUserToGroup Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  static async cognitoRefreshToken(refreshToken, username) {
    const command = new AdminInitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: this.clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        USERNAME: username,
        SECRET_HASH: crypto
          .createHmac("sha256", this.clientSecret)
          .update(`${username}${this.clientId}`)
          .digest("base64"),
      },
    });

    try {
      loggerService.log(
        {
          cognitoService: {
            action: "cognitoRefreshToken",
            layer: "services.cognitoRefreshToken",
            token: maskKeyRandomly(refreshToken),
          },
        },
        "[CIAM] Start cognitoRefreshToken Service"
      );
      const rs = await client.send(command);
      loggerService.log(
        {
          cognitoService: {
            response: `${rs}`,
            action: "cognitoRefreshToken",
            layer: "services.cognitoRefreshToken",
          },
        },
        "[CIAM] End cognitoRefreshToken Service - Success"
      );
      return rs;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            action: "cognitoRefreshToken",
            layer: "services.cognitoRefreshToken",
            error: `${error}`,
            token: maskKeyRandomly(refreshToken),
          },
        },
        {},
        "[CIAM] End cognitoRefreshToken Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }

  /**
   * Check if user belong only wild pass group
   * Centralize this function
   * @param {string} userEmail
   * @param {JSON} userCognito
   * @returns
   */
  static async checkUserBelongOnlyWildpass(userEmail, userCognito) {
    try {
      let checkingGroup = null;
      const userGroupsAtCognito = await this.cognitoAdminListGroupsForUser(userEmail);
      const membershipPasses = cognitoAttribute.getOrCheck(userCognito, "custom:membership");
      const passes = membershipPasses ? JSON.parse(membershipPasses) : null;

      const groups =
        userGroupsAtCognito && userGroupsAtCognito.Groups && userGroupsAtCognito.Groups.length
          ? userGroupsAtCognito.Groups.map((gr) => gr.GroupName)
          : [];

      if (groups.length && groups.length > 1) {
        return false;
      }

      if (groups.length && groups.length === 1) {
        checkingGroup = this.checkGroupByDifferentFormatMembership(passes, GROUP.WILD_PASS);
        //if one group and it membership-passes - return false
        if (!groups.includes(GROUP.WILD_PASS)) {
          checkingGroup = false;
        }
      }

      //cover for case length of group is empty - checking custom:membership
      if (groups.length === 0) {
        checkingGroup = this.checkGroupByDifferentFormatMembership(passes, GROUP.WILD_PASS);
      }

      if (checkingGroup === null) {
        await Promise.reject("User does not have wildpass or membership-passes group.");
      }

      return checkingGroup;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            action: "checkUserBelongOnlyWildpass",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] End checkUserBelongOnlyWildpass - Failed"
      );
      throw new Error("User does not have wildpass or membership-passes group.");
    }
  }

  /**
   * Check if user belong only membership-passes group
   * Centralize this function
   * @param {string} userEmail
   * @param {JSON} userCognito
   * @returns
   */
  static async checkUserBelongOnlyMembershipPasses(userEmail, userCognito) {
    try {
      const passkitConfig = await configsModel.findByConfigKey("membership-passes", "pass-type");
      const passkitMembershipPasses = passkitConfig && passkitConfig.value.length ? passkitConfig.value : [];
      const userGroupsAtCognito = await this.cognitoAdminListGroupsForUser(userEmail);
      const membershipPasses = cognitoAttribute.getOrCheck(userCognito, "custom:membership");
      const passes = membershipPasses ? JSON.parse(membershipPasses) : null;

      const groups =
        userGroupsAtCognito && userGroupsAtCognito.Groups && userGroupsAtCognito.Groups.length
          ? userGroupsAtCognito.Groups.map((gr) => gr.GroupName)
          : [];

      if (groups.length && groups.length >= 1) {
        if (passes) {
          return this.checkGroupByDifferentFormatMembership(passes, passkitMembershipPasses);
        }
        return groups.every((gr) => gr.includes(GROUP.MEMBERSHIP_PASSES));
      }

      //cover for case length of group is empty - checking custom:membership
      if (groups.length === 0) {
        //have not any clue to determine user belong which group
        if (!passes) {
          await Promise.reject("User does not have wildpass or membership-passes group.");
        }
        return this.checkGroupByDifferentFormatMembership(passes, passkitMembershipPasses);
      }

      return false;
    } catch (error) {
      loggerService.error(
        {
          cognitoService: {
            action: "checkUserBelongOnlyMembershipPasses",
            error: new Error(error),
          },
        },
        {},
        "[CIAM] End checkUserBelongOnlyMembershipPasses - Failed"
      );
      throw new Error("User does not have wildpass or membership-passes group.");
    }
  }

  static checkGroupByDifferentFormatMembership(passes, passkitConfig) {
    if (!passes) return null;
    //new format when membership-passes group exists
    if (Array.isArray(passes)) {
      return passes.every((pass) => passkitConfig.includes(pass.name));
    }

    //current format with WP old user
    if (typeof passes === "object" && passes && passes.name) {
      return passkitConfig.includes(passes.name);
    }

    return null;
  }
}

module.exports = Cognito;

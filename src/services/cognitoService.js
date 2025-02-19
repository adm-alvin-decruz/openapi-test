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
} = require("@aws-sdk/client-cognito-identity-provider");
const passwordService = require("../api/users/userPasswordService");
const loggerService = require("../logs/logger");
const { maskKeyRandomly } = require("../utils/common");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

class Cognito {
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
    const setUpdateParams = new AdminUpdateUserAttributesCommand(
      updateUserArray
    );

    try {
      result["cognitoUpdateResult"] = JSON.stringify(
        client.send(setUpdateParams)
      );
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
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthParameters: {
        SECRET_HASH: hashSecret,
        USERNAME: email,
        PASSWORD: password,
      },
    });
    try {
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
      return {
        message: JSON.stringify(error),
      };
    }
  }

  static async cognitoAdminGetUserByEmail(email) {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
    });

    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            action: "cognitoAdminGetUserByEmail",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminGetUserByEmail Service"
      );
      const userInfo = await client.send(getUserCommand);
      loggerService.log(
        {
          cognitoService: {
            email,
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
            email,
            action: "cognitoAdminGetUserByEmail",
            layer: "services.cognitoService",
            error: `${error}`,
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

    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            action: "cognitoAdminListGroupsForUser",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminListGroupsForUser Service"
      );
      const groups = await client.send(groupsBelongUserCommand);
      loggerService.log(
        {
          cognitoService: {
            email,
            groups,
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
            error: `${error}`,
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

  static async cognitoAdminCreateUser({
    email,
    firstName,
    lastName,
    birthdate,
    address,
    mandaiId,
    newsletter,
    source,
    phoneNumber,
    country,
  }) {
    const newUserArray = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      TemporaryPassword: passwordService.generatePassword(8),
      DesiredDeliveryMediums: ["EMAIL"],
      MessageAction: "SUPPRESS", // disable send verification email temp password
      UserAttributes: [
        { Name: "email_verified", Value: "true" },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
        { Name: "preferred_username", Value: email },
        { Name: "name", Value: `${firstName} ${lastName}` },
        { Name: "email", Value: email },
        { Name: "birthdate", Value: birthdate },
        { Name: "address", Value: address },
        { Name: "phone_number", Value: phoneNumber },
        { Name: "zoneinfo", Value: country },
        { Name: "custom:mandai_id", Value: mandaiId },
        { Name: "custom:newsletter", Value: JSON.stringify(newsletter) },
        { Name: "custom:terms_conditions", Value: "null" },
        { Name: "custom:visual_id", Value: "null" },
        { Name: "custom:vehicle_iu", Value: "null" },
        { Name: "custom:vehicle_plate", Value: "null" },
        { Name: "custom:last_login", Value: "null" },
        { Name: "custom:source", Value: source },
      ],
    };

    const newUserParams = new AdminCreateUserCommand(newUserArray);

    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            params: `${newUserArray.UserAttributes}`,
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
            email,
            params: `${newUserArray.UserAttributes}`,
            action: "cognitoAdminCreateUser",
            layer: "services.cognitoService",
            error: `${error}`,
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
            response: `${rs}`,
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
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
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
    try {
      loggerService.log(
        {
          cognitoService: {
            email,
            params,
            action: "cognitoAdminUpdateNewUser",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminUpdateNewUser Service"
      );
      const rs = await client.send(userUpdateParams);
      loggerService.log(
        {
          cognitoService: {
            email,
            response: `${rs}`,
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
            email,
            params,
            action: "cognitoAdminUpdateNewUser",
            layer: "services.cognitoService",
            error: `${error}`,
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
    const userChangePassword = new ChangePasswordCommand({
      AccessToken: accessToken,
      ProposedPassword: password,
      PreviousPassword: oldPassword,
    });
    try {
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
            action: "cognitoUserChangePassword",
            layer: "services.cognitoService",
          },
        },
        "[CIAM] Start cognitoAdminAddUserToGroup Service"
      );
      const rs = await client.send(adminAddUserToGroup);
      loggerService.log(
        {
          cognitoService: {
            response: `${rs}`,
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
}

module.exports = Cognito;

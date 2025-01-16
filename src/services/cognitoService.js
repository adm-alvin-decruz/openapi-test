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
  AdminAddUserToGroupCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const passwordService = require("../api/users/userPasswordService");
const loggerService = require("../logs/logger");
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
    const setUpdateParams = new AdminUpdateUserAttributesCommand(updateUserArray);

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

  static async cognitoUserLogin(req, hashSecret) {
    const userLoginParams = new AdminInitiateAuthCommand({
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      UserPoolId: process.env.USER_POOL_ID,
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthParameters: {
        SECRET_HASH: hashSecret,
        USERNAME: req.body.email,
        PASSWORD: req.body.password,
      },
    });
    try {
      const loginSession = await client.send(userLoginParams);
      return {
        accessToken: loginSession.AuthenticationResult.AccessToken,
        refreshToken: loginSession.AuthenticationResult.RefreshToken,
        idToken: loginSession.AuthenticationResult.IdToken,
      };
    } catch (error) {
      loggerService.error(`cognitoService.cognitoUserLogin Error: ${error}`);
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
      await client.send(userLogout);
      return {
        message: "success",
      };
    } catch (error) {
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
      return await client.send(getUserCommand);
    } catch (error) {
      loggerService.error(
        `cognitoService.cognitoAdminGetUserByEmail Error: ${error}`
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
      return await client.send(getUserCommand);
    } catch (error) {
      loggerService.error(
        `cognitoService.cognitoAdminGetUserByAccessToken Error: ${error}`
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
          rawError: error.toString()
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
      return await client.send(groupsBelongUserCommand);
    } catch (error) {
      loggerService.error(
          `cognitoService.cognitoAdminListGroupsForUser Error: ${error}`
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
    groups,
    mandaiId,
    newsletter,
    source,
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
        { Name: "address", Value: address ? address : "" },
        // custom fields
        { Name: "custom:membership", Value: groups ? JSON.stringify(groups) : "null" },
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
      return await client.send(newUserParams);
    } catch (error) {
      loggerService.error(
        `cognitoService.cognitoAdminCreateUser Error: ${error}`
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
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
      return await client.send(setPasswordParams);
    } catch (error) {
      loggerService.error(
        `cognitoService.cognitoAdminSetUserPassword Error: ${error}`
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
      return await client.send(setDeleteUserParams);
    } catch (error) {
      loggerService.error(
        `cognitoService.cognitoAdminDeleteUser Error: ${error}`
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
      return await client.send(userUpdateParams);
    } catch (error) {
      loggerService.error(`cognitoService.cognitoAdminUpdateNewUser Error: ${error}`);
      throw new Error(
          JSON.stringify({
            status: "failed",
            data: error,
          })
      );
    }
  }

  static async cognitoUserChangePassword(accessToken, password, oldPassword) {
    const userChangePassword = new ChangePasswordCommand({
      AccessToken: accessToken,
      ProposedPassword: password,
      PreviousPassword: oldPassword
    });
    try {
      return await client.send(userChangePassword);
    } catch (error) {
      loggerService.error(`cognitoService.cognitoUserChangePassword Error: ${error}`);
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
      GroupName: group
    });
    try {
      return await client.send(adminAddUserToGroup);
    } catch (error) {
      loggerService.error(`cognitoService.cognitoAdminAddUserToGroup Error: ${error}`);
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

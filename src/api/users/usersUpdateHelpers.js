/**
 * function to create name parameters that ready to use for cognito update
 * If name input not present, name will use existing from Cognito
 *
 * @param {JSON} reqBody
 * @param {JSON} userAttribute
 * @returns
 */
function createNameParameter(reqBody, userAttribute) {
  let name;

  // Check if firstName and lastName are provided in reqBody
  if (reqBody.firstName && reqBody.lastName && reqBody.firstName.trim() !== '' && reqBody.lastName.trim() !== '') {
      name = {
          "Name": "name",
          "Value": `${reqBody.firstName.trim()} ${reqBody.lastName.trim()}`
      };
  } else {
      // If firstName or lastName is missing or empty, find the name in userAttribute
      const nameAttribute = userAttribute.find(attr => attr.Name === "name");
      if (nameAttribute) {
          name = {
              "Name": "name",
              "Value": nameAttribute.Value
          };
      } else {
          // If name is not found in userAttribute, use a default or handle the error
          name = {
              "Name": "name",
              "Value": "Unknown"
          };
      }
  }

  return name;
}

module.exports = {
  createNameParameter
}
const resConfig = {
  MEMBERSHIPS_API_RESPONSE_CONFIG:'{"MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_SUCCESS","code":200,"message":"Get memberships success.","status":"success"},"MWG_CIAM_USERS_MEMBERSHIPS_NULL":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_NULL","code":200,"message":"No record found.","status":"failed"},"MWG_CIAM_PARAMS_ERR":{"mwgCode":"MWG_CIAM_PARAMS_ERR","code":400,"message":"Wrong parameters.","status":"failed"},"MWG_CIAM_501_ERR":{"mwgCode":"MWG_CIAM_501_ERR","code":501,"message":"Not implemented.","status":"failed"},"MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR":{"mwgCode":"MWG_CIAM_USERS_MEMBERSHIPS_EMAIL_ERR","code":200,"message":"Requested email is invalid or empty.","status":"failed"}}',
  MEMBERSHIP_CATEGORY: {
    FOBP_INDIVIDUAL_1Y: 'Individual – Adult',
    FOBP_CHILD_INDIVIDUAL_1Y: 'Individual – Child',
    FORA_SENIOR_INDIVIDUAL_1Y: 'Individual – Senior',
    FORS_CARETAKER_INDIVIDUAL_1Y: 'Individual – Caretaker',
    FONS_FAMILY_2A1C_1Y: '2 Adults & 1 Child | Teen',
    FOM_FAMILY_2A2C_1Y: '2 Adults & 2 Children | Teens',
    FOSZ_FAMILY_2A3C_1Y: '2 Adults & 3 Children | Teens',
    FOW_FAMILY_2A4C_1Y: '2 Adults & 4 Children | Teens',
    FOBP_FAMILY_2A5C_1Y: '2 Adults & 5 Children | Teens'
  }
};

module.exports = resConfig;

const tokenService = require('./services/tokenService');
const membershipPassWPService = require('./services/membershipPassWPService');
const queryTicketService = require('./services/queryTicketService');
const membershipPassRB1A1CService = require('./services/membershipPassRB1A1CService');
const membershipPassRBService = require('./services/membershipPassRBService');

async function main() {
  try {
    // Call the token service to get a valid token
    await tokenService.getToken();

    // Call the Membership Pass WP service
    const wpResponse = await membershipPassWPService.callMembershipPassWP(inputData);
    console.log('Membership Pass WP Response:', wpResponse);

    // Call the Query Ticket service
    const queryTicketResponse = await queryTicketService.callQueryTicket(inputData);
    console.log('Query Ticket Response:', queryTicketResponse);

    // Call the Membership Pass RB 1A1C service
    const rb1A1CResponse = await membershipPassRB1A1CService.callMembershipPassRB1A1C(inputData);
    console.log('Membership Pass RB 1A1C Response:', rb1A1CResponse);

    // Call the Membership Pass RB service
    const rbResponse = await membershipPassRBService.callMembershipPassRB(inputData);
    console.log('Membership Pass RB Response:', rbResponse);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
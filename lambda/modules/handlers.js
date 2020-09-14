const DynamoDB = require('./dynamo');
const helpers = require('./helpers');

const accountSid = 'ACeb9b19bd35a5b9ba51ce189b051f0917';
const authToken = '76ba22e09fc491876c0dcf0fe59afd34';

const client = require('twilio')(accountSid, authToken);
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const TWILIO_PHONE_NUMBER = '+12514510200';

const RESPONSES = {
  LAUNCH_DEFAULT: `<amazon:emotion intensity="medium"> Welcome to MentorConnect, the premier platform for Amazon interns to connect to Amazon mentors via one-on-one conference calls. If you would like more details, say "help"; otherwise, tell me: Are you an intern or a mentor? </amazon:emotion>`,
  PERMISSIONS_ERROR: `Before using this skill, please make sure to add your phone number to your Alexa or Amazon account, and enable it for this skill!`,
  DEFAULT_HELP_MESSAGE: `<amazon:emotion intensity="high"> If you need help or have any questions, please say "help". </amazon:emotion>`,
  UNAUTHORIZED_ACCESS: `Huh, you don't have access to this command. Please say 'help' for more information.`,
};

/* 
   Function that connects an intern and a mentor from the list of 
   queued phone numbers. The calls are made via Twilio and bridged
   together into the same conference call.
*/
async function bridgeCall(internNumber, mentorNumber) {
  const response = new VoiceResponse();
  const dial = response.dial();
  dial.conference('My conference');

  await client.conferences.list().then(async (c) => {
    await client.conferences(c.sid).participants.create({
      from: TWILIO_PHONE_NUMBER,
      to: internNumber,
    });
    await client.conferences(c.sid).participants.create({
      from: TWILIO_PHONE_NUMBER,
      to: mentorNumber,
    });
  });
}

const handleNewUserLaunch = (handlerInput) => {
  return handlerInput.responseBuilder
    .speak(RESPONSES.LAUNCH_DEFAULT)
    .reprompt(RESPONSES.DEFAULT_HELP_MESSAGE)
    .getResponse();
};

const handleExistingMentorLaunch = async (handlerInput) => {
  const { responseBuilder } = handlerInput;

  const name = await helpers.getUserName(handlerInput);
  const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);

  const availableMentorData = await DynamoDB.getAvailableMentor(phoneNumber);
  if (
    availableMentorData &&
    Date.now() < availableMentorData.availableDuration + availableMentorData.availableTimestamp
  ) {
    const minsInQueue = Math.ceil(
      (Date.now() - availableMentorData.availableTimestamp) / (1000 * 60),
    );
    responseBuilder.speak(
      `Hi ${name}, you have been in the mentor queue for ${minsInQueue} ${
        minsInQueue > 1 ? 'minutes' : 'minute'
      }. If you would like to be removed, say "remove". Otherwise, you should expect a call from an intern soon!`,
    );
  } else {
    responseBuilder.speak(
      `Hi ${name}, welcome back to MentorConnect! Looks like you are currently not in the mentor queue. Please say "I'm available" to start receiving calls from interns.`,
    );
  }

  return responseBuilder.reprompt(RESPONSES.DEFAULT_HELP_MESSAGE).getResponse();
};

const handleExistingInternLaunch = async (handlerInput) => {
  const name = await helpers.getUserName(handlerInput);
  const { responseBuilder } = handlerInput;

  const mentorCount = await DynamoDB.getAvailableMentorCount();
  if (mentorCount > 0) {
    responseBuilder.speak(
      `Welcome back ${name}. We currently have ${mentorCount} ${
        mentorCount > 1 ? 'mentors' : 'mentor'
      } in queue ready to talk to interns. Please say "connect me to a mentor" to be connected!`,
    );
  } else {
    responseBuilder.speak(
      `Welcome back ${name}. We currently have no mentors available. Please come back later!`,
    );
  }

  return responseBuilder.reprompt(RESPONSES.DEFAULT_HELP_MESSAGE).getResponse();
};

const handleInternConnectRequest = async (handlerInput) => {
  const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);

  const mentorCount = await DynamoDB.getAvailableMentorCount();
  if (mentorCount === 0) {
    return handlerInput.responseBuilder
      .speak(`No mentors are available at this time. Please try again later.`)
      .getResponse();
  }

  const mentor = await DynamoDB.getFirstAvailableMentor();
  DynamoDB.deleteAvailableMentor(mentor.phoneNumber);

  setTimeout(() => {
    bridgeCall(phoneNumber, mentor.phoneNumber);
  }, 1000);

  return handlerInput.responseBuilder
    .speak('Connecting! <break time="500ms"/> Expect a call from your mentor in a few seconds!')
    .getResponse();
};

const handleMentorConnectRequest = async (handlerInput) => {
  const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);
  DynamoDB.addAvailableMentor(phoneNumber);

  const speakOutput = `Alright, I added your phone number to the queue. If an intern would like to chat, you should expect a call to the number: <say-as interpret-as="telephone">${phoneNumber}</say-as>`;

  return handlerInput.responseBuilder.speak(speakOutput).getResponse();
};

const handlePermissionError = (handlerInput) => {
  return handlerInput.responseBuilder.speak(RESPONSES.PERMISSIONS_ERROR).getResponse();
};

const handleUnauthorizedAccess = (handlerInput) => {
  return handlerInput.responseBuilder
    .speak(RESPONSES.UNAUTHORIZED_ACCESS)
    .reprompt(DEFAULT_HELP_MESSAGE)
    .getResponse();
};

module.exports = {
  RESPONSES,
  handleUnauthorizedAccess,
  handleNewUserLaunch,
  handleInternConnectRequest,
  handleMentorConnectRequest,
  handleExistingInternLaunch,
  handleExistingMentorLaunch,
  handlePermissionError,
};

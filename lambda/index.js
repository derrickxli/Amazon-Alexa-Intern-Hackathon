/*
   MentorConnect is an Alexa Skill developed by 5 Amazon Interns from the 
   Summer 2020 intern cohort. It is a skill that helps connect interns with
   mentors during pre-onboarding via a matchmaking system that directly bridges
   phone calls made between a mentor and an intern.

   https://developer.amazon.com/alexa/console/ask/test/amzn1.ask.skill.84c53d73-6a50-4a6d-b67e-7922beb11f72/development/en_US/
   */

const DynamoDB = require('./modules/dynamo');

const Alexa = require('ask-sdk-core');

const helpers = require('./modules/helpers');
const handlers = require('./modules/handlers');

/* 
   Launch intent for the Alexa skill. Elaborates on what functionality there is
   for this skill and offers what options are available to the user.
*/
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    if (helpers.skillIsMissingPermissions(handlerInput)) {
      return handlerInput.responseBuilder.speak(RESPONSES.PERMISSIONS_ERROR).getResponse();
    }

    const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);
    const userData = await DynamoDB.getUser(phoneNumber);

    if (userData && userData.isMentor) {
      return handlers.handleExistingMentorLaunch(handlerInput);
    }

    if (userData && !userData.isMentor) {
      return handlers.handleExistingInternLaunch(handlerInput);
    }

    return handlers.handleNewUserLaunch(handlerInput);
  },
};

const ConnectIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ConnectIntent'
    );
  },
  async handle(handlerInput) {
    const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);
    const userInfo = await DynamoDB.getUser(phoneNumber);

    if (!userInfo) {
      return handlerInput.responseBuilder
        .speak(
          'Please sign up as a mentor or intern before using this command. To sign up as an intern, please say "intern". To sign up as a mentor, you can say "mentor".',
        )
        .reprompt(handlers.RESPONSES.DEFAULT_HELP_MESSAGE)
        .getResponse();
    }

    if (userInfo.isMentor) {
      return handlers.handleMentorConnectRequest(handlerInput);
    } else {
      return handlers.handleInternConnectRequest(handlerInput);
    }
  },
};

/* 
   Immediately calls an available mentor from the queue, and prepares a call via
   Twilio to both the mentor and the intern's phone number. If there are no mentors,
   the intern user is prompted to try again later.
*/
const InternIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'InternIntent'
    );
  },
  async handle(handlerInput) {
    const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);
    DynamoDB.addUser(phoneNumber, false);
    const speakOutput =
      'Great! We added you to our system. You can now say "connect me" to be connected to an available Amazon mentor';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(handlers.RESPONSES.DEFAULT_HELP_MESSAGE)
      .getResponse();
  },
};

/* 
   Adds the mentor's phone number to the queue. When an intern requests a mentor,
   the mentor will be called via Twilio and put into a conference call with the intern.
*/
const MentorIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'MentorIntent'
    );
  },
  async handle(handlerInput) {
    const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);
    DynamoDB.addUser(phoneNumber, true);
    const speakOutput =
      'Great news! You are now signed up as a mentor. If you would like to start receiving calls from interns, you can say "I\'m available"';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(handlers.RESPONSES.DEFAULT_HELP_MESSAGE)
      .getResponse();
  },
};

/* 
   Lists the available commands to ask Alexa while usin this skill.
 */
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speakOutput = `If you would like the technical details of this project, say "Technical Details".
    If you're a mentor, say "Mentor". 
    If you're an intern, say "Intern".
    If you would like to be removed from the queue, say "Remove".`;

    const speakReprompt = `If you would like to hear this again, say "help".`;

    return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakReprompt).getResponse();
  },
};

/* 
   Removes a mentor from the queue by removing the entry in DynamoDB, allowing
   the mentor the requeue later.
*/
const RemoveIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'RemoveIntent'
    );
  },
  async handle(handlerInput) {
    const phoneNumber = await helpers.getUserPhoneNumber(handlerInput);
    const userInfo = await DynamoDB.getUser(phoneNumber);

    if (!userInfo || (userInfo && !userInfo.isMentor)) {
      return handlers.handleUnauthorizedAccess;
    }

    const { responseBuilder } = handlerInput;
    const deleteResponse = await DynamoDB.deleteAvailableMentor(phoneNumber);

    console.log('DELETE RESPONSE: ' + JSON.stringify(deleteResponse));

    if (deleteResponse.Attributes) {
      responseBuilder.speak(
        `You have been removed from the mentor queue! Thanks for using MentorConnect.`,
      );
    } else {
      responseBuilder.speak(
        'Hmm, this operation failed. Are you sure you are in the mentor queue? You can join the queue by saying "mentor".',
      );
    }

    return handlerInput.responseBuilder
      .reprompt(handlers.RESPONSES.DEFAULT_HELP_MESSAGE)
      .getResponse();
  },
};

/* 
    Explains the background and technical details of this skill.
 */
const TechnicalDetailsIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'TechnicalDetailsIntent'
    );
  },
  handle(handlerInput) {
    const speakOutput = `Hello. I am MentorConnect, <break time="200ms"/> your personal assistant to help connect
      interns to mentors from Amazon. <break time="250ms"/>
      
      I was made by a team of five Amazon interns from the
      summer 2020 cohort. The team is a group of 5 students, <break time="200ms"/> 4 from Stanford and 1 from Drexel
      University. <break time="200ms"/> Our goal is to ensure that students will be able to quell any questions or 
      concerns that are not easily addressed in emails or FAQs during pre-onboarding with an
      actual Amazon employee. <break time="250ms"/>
      
      I am programmed in JavaScript hosted on an AWS Lambda server. 
      The two main backend services I use are Twilio to automatically bridge two phone calls between
      interns and mentors, and DynamoDB to maintain a queue of callers in realtime. <break time="500ms"/>
      
      The hackathon team that made me put a lot of effort into me and hopes that this will be a great tool for future
      interns to connect with Amazon and get the most out of their experience!`;

    const speakReprompt = `You can say "Help" to return to the help menu.`;

    return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakReprompt).getResponse();
  },
};

/* 
   Stops the skill and causes it to exit.
 */
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent')
    );
  },
  handle(handlerInput) {
    const speakOutput = 'Thanks for using MentorConnect! Goodbye!';
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  },
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);
    const speakOutput = error;
    return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
  },
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    InternIntentHandler,
    MentorIntentHandler,
    ConnectIntentHandler,
    TechnicalDetailsIntentHandler,
    RemoveIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .withApiClient(new Alexa.DefaultApiClient())
  .withSkillId('amzn1.ask.skill.fcf4ad14-53d9-45b7-ad48-f2df10e9d9ee')
  .addErrorHandlers(ErrorHandler)
  .lambda();

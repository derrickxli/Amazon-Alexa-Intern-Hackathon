// const accountSid = 'ACeb9b19bd35a5b9ba51ce189b051f0917';
// const authToken = '76ba22e09fc491876c0dcf0fe59afd34';

// const client = require('twilio')(accountSid, authToken);
// const VoiceResponse = require('twilio').twiml.VoiceResponse;

// const TWILIO_PHONE_NUMBER = '+12514510200';

/* 
   Function that connects an intern and a mentor from the list of 
   queued phone numbers. The calls are made via Twilio and bridged
   together into the same conference call.
*/
const bridgeCall = async (internNumber, mentorNumber) => {
  const accountSid = 'ACeb9b19bd35a5b9ba51ce189b051f0917';
  const authToken = '76ba22e09fc491876c0dcf0fe59afd34';

  const client = require('twilio')(accountSid, authToken);
  const VoiceResponse = require('twilio').twiml.VoiceResponse;

  const TWILIO_PHONE_NUMBER = '+12514510200';
  setTimeout(async () => {
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
  }, 3000);
};

const test = () => {
  console.log(test);
};

module.exports = { bridgeCall, test };

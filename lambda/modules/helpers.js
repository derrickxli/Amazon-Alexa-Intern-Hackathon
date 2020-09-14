const getUserPhoneNumber = async (handlerInput) => {
  try {
    const {
      phoneNumber,
    } = await handlerInput.serviceClientFactory.getUpsServiceClient().getProfileMobileNumber();

    return phoneNumber;
  } catch (e) {
    throw "Weird, we can't find your phone number in our system. If you have a phone number in your Alexa or Amazon account, please enable it in your skills settings for this skill. If not, please add a phone number to your account";
  }
};

const getUserName = async (handlerInput) => {
  try {
    return await handlerInput.serviceClientFactory.getUpsServiceClient().getProfileGivenName();
  } catch (e) {
    console.log('Error while getting name:', JSON.stringify(e));
    return '';
  }
};

const skillIsMissingPermissions = (handlerInput) => {
  try {
    if (handlerInput.requestEnvelope.context.System.apiAccessToken) {
      return false;
    } else {
      return true;
    }
  } catch (e) {
    return true;
  }
};

module.exports = { skillIsMissingPermissions, getUserPhoneNumber, getUserName };

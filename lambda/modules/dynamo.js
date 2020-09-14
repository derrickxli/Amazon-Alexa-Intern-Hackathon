const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

const USERS_TABLE_NAME = 'Users';
const MENTORS_TABLE_NAME = 'Mentors';
// 30 mins
const MENTOR_AVAILABLE_DURATION_MS = 1800000;

const addUser = (phoneNumber, isMentor) => {
  var mentorParams = {
    TableName: USERS_TABLE_NAME,
    Item: {
      phoneNumber: phoneNumber.toString(),
      isMentor: isMentor,
    },
  };

  return docClient.put(mentorParams).promise();
};

const getUser = async (phoneNumber) => {
  // Find if the user is in the Users table then return the entry
  const userParams = {
    TableName: USERS_TABLE_NAME,
    Key: {
      phoneNumber: phoneNumber.toString(),
    },
  };

  try {
    return (await docClient.get(userParams).promise()).Item;
  } catch (e) {
    return null;
  }
};

const getAvailableMentorCount = async () => {
  const params = {
    TableName: MENTORS_TABLE_NAME,
  };

  try {
    const result = await docClient.scan(params).promise();
    return result.Items.length;
  } catch (e) {
    return null;
  }
};

const getAvailableMentor = async (phoneNumber) => {
  // Find if the user is in the Users table then return the entry
  const mentorParams = {
    TableName: MENTORS_TABLE_NAME,
    Key: {
      phoneNumber: phoneNumber.toString(),
    },
  };

  try {
    return (await docClient.get(mentorParams).promise()).Item;
  } catch (e) {
    return null;
  }
};

const removeExpiredAvailableMentors = async () => {};

const getFirstAvailableMentor = async () => {
  const params = {
    TableName: MENTORS_TABLE_NAME,
    Limit: 1,
  };

  try {
    const result = await docClient.scan(params).promise();
    return result.Items[0];
  } catch (e) {
    return null;
  }
};

const deleteAvailableMentor = (phoneNumber) => {
  const mentorParams = {
    TableName: MENTORS_TABLE_NAME,
    Key: {
      phoneNumber: phoneNumber.toString(),
    },
    ReturnValues: 'ALL_OLD',
  };

  return docClient.delete(mentorParams).promise();
};

const addAvailableMentor = (phoneNumber) => {
  const mentorParams = {
    TableName: MENTORS_TABLE_NAME,
    Item: {
      phoneNumber: phoneNumber.toString(),
      availableTimestamp: Date.now(),
      availableDuration: MENTOR_AVAILABLE_DURATION_MS,
    },
  };

  return docClient.put(mentorParams).promise();
};

module.exports = {
  addUser,
  getUser,
  getAvailableMentor,
  getAvailableMentorCount,
  getFirstAvailableMentor,
  addAvailableMentor,
  deleteAvailableMentor,
};

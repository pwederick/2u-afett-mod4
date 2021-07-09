import firebase from "./firebase-config";

// added 4.3.4
let database = null;
let userKey = null;
let roomUsername = null;

// added 4.3.5
const checkRoomAvailability = async (database) => {
  try {
    const roomSnapshot = await database.once("value");
    const roomOccupants = roomSnapshot.val();
    if (!roomOccupants) {
      return true;
    }
    if (Object.keys(roomOccupants).length < 2) {
      return true;
    }

    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
};

// added 4.3.4; updated 4.3.5; updated 4.3.6
export const joinRoom = async (roomId, username, { handleUserPresence }) => {
  try {
    // save username to `firebase.js` file for reference
    roomUsername = username;

    // get reference to room
    database = firebase.database().ref(`/rooms/${roomId}`);

    // check if room is full, set `isRoomOpen` to `false` if so
    const isRoomOpen = await checkRoomAvailability(database);
    // if room isn't open
    if (!isRoomOpen) {
      return false;
    }

    // push user into room and create presence
    const user = await database.push({ username });
    // get user key that Firebase generates and save it to global variable
    userKey = user.path.pieces_.pop();

    // remove user from room if they leave the application
    database.child(`/${userKey}`).onDisconnect().remove();

    // turn on event listeners
    initUserListeners(database, handleUserPresence);

    return true;
  } catch (err) {
    console.log(err);
  }
};

// added 4.3.6
const initUserListeners = (database, handleUserPresence) => {
  database.on("child_added", (userSnapshot) => {
    if (userSnapshot.key !== userKey && userSnapshot.key !== "messages") {
      console.log("User Joined: ", userSnapshot.val());
      handleUserPresence(true, userSnapshot.val().username);
    }
  });

  database.on("child_removed", (userSnapshot) => {
    if (userSnapshot.key !== userKey && userSnapshot.key !== "messages") {
      console.log("User Left: ", userSnapshot.val());
      handleUserPresence(false);
    }
  });
};

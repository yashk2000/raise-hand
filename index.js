let callFrame, room;
async function createCallframe() {
  const callWrapper = document.getElementById('wrapper');
  callFrame = await window.DailyIframe.createFrame(callWrapper);

  // Add all event listeners
  callFrame
    .on('loaded', showEvent)
    .on('started-camera', showEvent)
    .on('camera-error', showEvent)
    .on('joining-meeting', toggleLobby)
    .on("joined-meeting", handleJoinedMeeting)
    .on("left-meeting", handleLeftMeeting)
    .on("participant-joined", handleNewParticipant)
    .on("participant-left", handleParticipantUpdate)
    .on("participant-updated", handleParticipantUpdate)
    .on("app-message", handleReceivedMessage);

  const roomURL = document.getElementById('url-input');
  const joinButton = document.getElementById('join-call');
  const createButton = document.getElementById('create-and-start');
  roomURL.addEventListener('input', () => {
    if (roomURL.checkValidity()) {
      joinButton.classList.add('valid');
      joinButton.classList.remove('disabled-button');
      joinButton.removeAttribute('disabled');
      createButton.classList.add('disabled-button');
    } else {
      joinButton.classList.remove('valid');
    }
  });

  roomURL.addEventListener('keyup', (event) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      joinButton.click();
    }
  });
}

let attendee = {
  handRaised: false
};

/* Creating and updating a list containing all participants in the meeting 
along with broadcasting whether an attendee has their hand raised or not */
let isHandRaised = {
  list: [],
  // Broadcasting attendee hand state
  sendAttendeeHandState() {
    let data = {
      handRaised: attendee.handRaised,
      session_id: attendee.session_id
    };
    callFrame.sendAppMessage(data, '*');
  },
  // Updating the list, followed by the participants section
  updateHandStates(e) {
    this.list = [...this.list].concat([
      { session_id: e.fromId, handRaised: e.data.handRaised }
    ]);
    handleParticipantUpdate();
  },
  // Deleting a participant
  deleteHandState(e) {
    this.list.splice(this.list.indexOf(e.data.session_id), 1);
    handleParticipantUpdate();
  },
  updateList(e) {
    e.data.handRaised
      ? isHandRaised.updateHandStates(e)
      : isHandRaised.deleteHandState(e);
  },
  toggleState() {
    attendee = {
      ...attendee,
      handRaised: !attendee.handRaised
    };
  }
};

/* This is the function called if an attendee presses on 
the raise hand button and handles the change in state */
async function changeHandState() {
  isHandRaised.toggleState();
  isHandRaised.sendAttendeeHandState();
  handleParticipantUpdate();
  document.getElementById("hand-img").classList.toggle("hidden");
  document.querySelector(".raise-hand-button").innerText = `${
    attendee.handRaised ? "Lower Hand" : "Raise Hand"
    }`;
  document.querySelector(".hand-state").innerText = `${
    attendee.handRaised ? "Your hand is raised 🙋" : "Your hand is down 💁"
    }`;
}

// Receive updates when other participants raise hands and updates the list
async function handleReceivedMessage(e) {
  isHandRaised.updateList(e);
}

// Handles actions once an attendee joins the meeting
async function handleJoinedMeeting(e) {
  attendee = {
    ...e.participants.local,
    handRaised: false
  };

  let attendeeInformationDisplay = document.querySelector(
    ".local-participant-info"
  );
  attendeeInformationDisplay.innerHTML = `
    <img
    id="hand-img"
    class=" is-pulled-right hidden"
    src="assets/hand.png"
    alt="hand icon"
    />  

    <p class="name-label"><strong>${attendee.user_name + " (You)" ||
    "You"}</strong></p>
    <button
      class="button is-info raise-hand-button"
      onclick="changeHandState()"
      >Raise Hand
    </button>
    <p class="hand-state has-text-right">Your hand is down 💁</p>
`;
  await handleParticipantUpdate();
  setTimeout(isHandRaised.sendAttendeeHandState, 2500)
  toggleLobby();
  toggleMainInterface();
}

// Updates participants when a new participant enters an ongoing meeting
async function handleNewParticipant() {
  attendee = { ...attendee };
  await handleParticipantUpdate();
  setTimeout(isHandRaised.sendAttendeeHandState, 2500)
}

// Handling when the attendee leaves the meeting
function handleLeftMeeting(e) {
  let list = document.querySelector(".participant-list");
  list.innerHTML = "";
  toggleMainInterface();
}

/* The function handling all UI changes when attendess raise or lower 
their hands*/
function handleParticipantUpdate() {
  let listRaisedHands = isHandRaised.list.map(caller => caller.session_id);
  let listParticipants = callFrame.participants();
  let listDisplayParticipants = document.querySelector(".participant-list");
  listDisplayParticipants.innerHTML = "";

  Object.keys(listParticipants).forEach(participantIndex => {
    let participant = listParticipants[participantIndex];
    let callerHandUp = listRaisedHands.includes(participant.session_id);
    let li = document.createElement("li");

    // Leave out the local attendee
    if (participant.local) {
      return;
    }

    let handStateLabel = callerHandUp ? "Hand Raised" : "";
    li.innerHTML =
      `<div>
        ${listRaisedHands.includes(participant.session_id)
        ? `<img
          id="hand-img"
          class=" is-pulled-right"
          src="assets/hand.png"
          alt="hand icon"
          />`
        : ""
      }
      ${listRaisedHands.includes(participant.session_id)
        ? `<p>${participant.user_name + " has raised their hand." || "Guest"}</p>`
        : `<p>${participant.user_name || "Guest"}</p>`
      }
        <p class="hand-state has-text-right">${handStateLabel}</p> 
      </div>`;
    listDisplayParticipants.append(li);
  });
}

async function createRoom() {
  // This endpoint is using the proxy as outlined in netlify.toml
  /*const newRoomEndpoint = `${window.location.origin}/api/rooms`;

  // we'll add 30 min expiry (exp) so rooms won't linger too long on your account
  // we'll also turn on chat (enable_chat)
  // see other available options at https://docs.daily.co/reference#create-room
  const exp = Math.round(Date.now() / 1000) + 60 * 30;
  const options = {
    properties: {
      exp: exp,
      enable_chat: true,
    },
  };

  try {
    let response = await fetch(newRoomEndpoint, {
        method: 'POST',
        body: JSON.stringify(options),
        mode: 'cors',
      }),
      room = await response.json();
    return room;
  } catch (e) {
    console.error(e);
  }*/

  // Comment out the above and uncomment the below, using your own URL
  // if you prefer to test with a hardcoded room
  return {url: "https://yashk.daily.co/hello"}
}

async function createRoomAndStart() {
  const createAndStartButton = document.getElementById('create-and-start');
  const copyUrl = document.getElementById('copy-url');
  const errorTitle = document.getElementById('error-title');
  const errorDescription = document.getElementById('error-description');

  createAndStartButton.innerHTML = 'Loading...';

  room = await createRoom();
  if (!room) {
    errorTitle.innerHTML = 'Error creating room';
    errorDescription.innerHTML =
      "If you're developing locally, please check the README instructions.";
    toggleMainInterface();
    toggleError();
  }
  copyUrl.value = room.url;

  showDemoCountdown();

  try {
    callFrame.join({
      url: room.url,
      showLeaveButton: true,
    });
  } catch (e) {
    toggleError();
    console.error(e);
  }
}

/* Event listener callbacks and helpers */
function showEvent(e) {
  console.log('callFrame event', e);
}

function toggleHomeScreen() {
  const homeScreen = document.getElementById('start-container');
  homeScreen.classList.toggle('hide');
}

function toggleLobby() {
  const callWrapper = document.getElementById('wrapper');
  callWrapper.classList.toggle('in-lobby');
  toggleHomeScreen();
}

function toggleControls() {
  const callControls = document.getElementById('call-controls-wrapper');
  callControls.classList.toggle('hide');
}

function toggleCallStyling() {
  const callWrapper = document.getElementById('wrapper');
  const createAndStartButton = document.getElementById('create-and-start');
  createAndStartButton.innerHTML = 'Create room and start';
  callWrapper.classList.toggle('in-call');
}

function toggleError() {
  const errorMessage = document.getElementById('error-message');
  errorMessage.classList.toggle('error-message');
  toggleControls();
  toggleCallStyling();
}

function toggleMainInterface() {
  toggleHomeScreen();
  toggleControls();
  toggleCallStyling();
}

// URL copying function after joining the meeting
function copyUrl() {
  const url = document.getElementById('copy-url');
  const copyButton = document.getElementById('copy-url-button');
  url.select();
  document.execCommand('copy');
  copyButton.innerHTML = 'Copied!';
}

function showDemoCountdown() {
  const countdownDisplay = document.getElementById('demo-countdown');

  if (!window.expiresUpdate) {
    window.expiresUpdate = setInterval(() => {
      let exp = room && room.config && room.config.exp;
      if (exp) {
        let seconds = Math.floor((new Date(exp * 1000) - Date.now()) / 1000);
        let minutes = Math.floor(seconds / 60);
        let remainingSeconds = Math.floor(seconds % 60);

        countdownDisplay.innerHTML = `Demo expires in ${minutes}:${
          remainingSeconds > 10 ? remainingSeconds : '0' + remainingSeconds
        }`;
      }
    }, 1000);
  }
}

function showRoomInput() {
  const urlInput = document.getElementById('url-input');
  const urlClick = document.getElementById('url-click');
  const urlForm = document.getElementById('url-form');
  urlClick.classList.remove('show');
  urlClick.classList.add('hide');

  urlForm.classList.remove('hide');
  urlForm.classList.add('show');
  urlInput.focus();
}

async function joinCall() {
  const url = document.getElementById('url-input').value;
  const copyUrl = document.getElementById('copy-url');
  copyUrl.value = url;

  try {
    await callFrame.join({
      url: url,
      showLeaveButton: true,
    });
  } catch (e) {
    if (
      e.message === "can't load iframe meeting because url property isn't set"
    ) {
      toggleMainInterface();
      console.log('empty URL');
    }
    toggleError();
    console.error(e);
  }
}

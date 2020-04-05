'use strict';

const { connect } = require('twilio-video');

/**
 * Attach a Track to the DOM.
 * @param track - the Track to attach
 * @param $participants - the DOM container
 */
function attachTrack(track, $participants) {
  const mediaElement = track.attach();
  mediaElement.style.width = '100%';
  $participants.append(mediaElement);
}

/**
 * Detach a Track from the DOM.
 * @param track
 */
function detachTrack(track) {
  track.detach().forEach(mediaElement => {
    mediaElement.remove();
  });
}

/**
 * Subscribe to the RemoteParticipant's media.
 * @param participant - the RemoteParticipant
 * @param $participants - the DOM container
 */
function participantConnected(participant, $participants) {
  // Subscribe to the RemoteTrackPublications already published by the
  // RemoteParticipant.
  participant.tracks.forEach(publication => {
    trackPublished(publication, $participants);
  });

  // Subscribe to the RemoteTrackPublications that will be published by
  // the RemoteParticipant later.
  participant.on('trackPublished', publication => {
    trackPublished(publication, $participants);
  });
}

/**
 * Subscribe to the RemoteTrackPublication's media.
 * @param publication - the RemoteTrackPublication
 * @param $participants - the DOM container
 */
function trackPublished(publication, $participants) {
  // If the RemoteTrackPublication is already subscribed to, then
  // attach the RemoteTrack to the DOM.
  if (publication.track) {
    attachTrack(publication.track, $participants);
  }

  // Once the RemoteTrackPublication is subscribed to, attach the
  // RemoteTrack to the DOM.
  publication.on('subscribed', track => {
    attachTrack(track, $participants);
  });

  // Once the RemoteTrackPublication is unsubscribed from, detach the
  // RemoteTrack from the DOM.
  publication.on('unsubscribed', detachTrack);
}

/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 * @param connectOptions - the ConnectOptions used to join a Room
 * @param $room - the DOM container for the quick start's UI
 * @param $leave - the button for leaving the Room
 */
function joinRoom(token, connectOptions, $room, $leave) {
  const $participants = $('#participants', $room);
  return connect(token, connectOptions).then(room => {
    window.room = room;

    // Find the LocalVideoTrack from the Room's LocalParticipant.
    const localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0].track;

    // Start the local video preview.
    attachTrack(localVideoTrack, $participants);

    // Subscribe to the media published by RemoteParticipants already in the Room.
    room.participants.forEach(participant => {
      participantConnected(participant, $participants);
    });

    // Subscribe to the media published by RemoteParticipants joining the Room later.
    room.on('participantConnected', participant => {
      participantConnected(participant, $participants);
    });

    // Leave the Room when the "Leave Room" button is clicked.
    $leave.click(function onLeave() {
      $leave.off('click', onLeave);
      room.disconnect();
    });

    if (window.onbeforeunload) {
      // Leave the Room when the "beforeunload" event is fired.
      window.addEventListener('beforeunload', () => room.disconnect());
    }

    if (window.onpagehide) {
      // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
      // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
      window.onpagehide = () => room.disconnect();
    }

    return new Promise(resolve => {
      room.once('disconnected', () => {
        // Stop the local video preview.
        detachTrack(localVideoTrack);
        window.room = null;
        resolve();
      });
    });
  });
}

module.exports = joinRoom;
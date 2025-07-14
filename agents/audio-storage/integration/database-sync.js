const { Song, Collaboration } = require('../../database/models');

async function updateSongAudioUrl(songId, audioUrl) {
  await Song.update({ audioUrl }, { where: { id: songId } });
}

async function updateCollaborationAudioUrl(collabId, audioUrl) {
  await Collaboration.update({ audioUrl }, { where: { id: collabId } });
}

module.exports = {
  updateSongAudioUrl,
  updateCollaborationAudioUrl,
}; 
const { toPronote } = require('./objects');
const { cipher } = require('../cipher');

const EXTERNAL_FILES_FOLDER = 'FichiersExternes/';
const FileTypes = {
    0: 'link',
    1: 'file'
}

function getFileURL(session, { id, name, type })
{
    const fileID = cipher(session, JSON.stringify(toPronote({ id, type })));
    const fileName = encodeURIComponent(encodeURIComponent(name)); // *Clown emoji*

    if (FileTypes[type] === 'link') {
        return session.server + EXTERNAL_FILES_FOLDER + fileID + '/link?Session=' + session.id;
    }
    return session.server + EXTERNAL_FILES_FOLDER + fileID + '/' + fileName + '?Session=' + session.id;
}

module.exports = { getFileURL };

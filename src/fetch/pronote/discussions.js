const parse = require('../../data/types');
const request = require('../../request');
const { toPronote } = require('../../data/objects');

const navigate = require('./navigate');

const ACCOUNTS = ['student', 'parent'];

const RECIPIENTS_PAGE_NAME = 'ListeRessourcesPourCommunication';
const RECIPIENTS_TAB_ID = 7;

const CREATE_DISCUSSION_PAGE_NAME = 'SaisieMessage';
const CREATE_DISCUSSION_TAB_ID = 7;

const DISCUSSIONS_PAGE_NAME = 'ListeMessagerie';
const DISCUSSIONS_TAB_ID = 131;

const DISCUSSION_PAGE_NAME = 'ListeMessages';
const DISCUSSION_TAB_ID = 131;

async function getRecipients(session, user)
{
    const teachersRecipients = await navigate(session, user, RECIPIENTS_PAGE_NAME, RECIPIENTS_TAB_ID, ACCOUNTS, {
        filtreElement: {
            G: 1,
            N: 0
        },
        onglet: {
            G: 3,
            N: 0,
            L: 'Professeurs'
        }
    });

    const staffRecipients = await navigate(session, user, RECIPIENTS_PAGE_NAME, RECIPIENTS_TAB_ID, ACCOUNTS, {
        filtreElement: {
            G: 1,
            N: 0
        },
        onglet: {
            G: 34,
            N: 0,
            L: 'Personnels'
        }
    })

    if (!teachersRecipients && !staffRecipients) {
        return null;
    }

    const teachers = parse(teachersRecipients.listeRessourcesPourCommunication, ({ P, listeRessources,
        avecDiscussion, estPrincipal }) => {
        const subjects = parse(listeRessources, ({ estUneSousMatiere, libelleMatiere }) => ({
            isSubSubject: estUneSousMatiere,
            subject: libelleMatiere
        }));
        subjects.forEach(sub => {
            if (sub.isSubSubject) {
                const subject = subjects.find(s => s.name === sub.subject);
                if (!subject.subSubjects) {
                    subject.subSubjects = [];
                }
                subject.subSubjects.push(sub.name);
            }
        })
        return {
            teacherId: P,
            subjects: subjects.filter(s => !s.isSubSubject),
            discussionOpen: avecDiscussion,
            isMainTeacher: estPrincipal,
            role: 'teacher'
        }
    })

    const staff = parse(staffRecipients.listeRessourcesPourCommunication, ({ P, fonction,
        avecDiscussion }) => ({
        staffId: P,
        function: parse(fonction),
        discussionOpen: avecDiscussion,
        role: 'staff'
    }))

    return [].concat(teachers).concat(staff);
}

async function createDiscussion(session, user, subject, message, recipients)
{
    const recipientsPronote = recipients.map(r => ({
        ...toPronote({ ...r, id: r.pronoteId }),
        E: 2
    }));
    return request(session, CREATE_DISCUSSION_PAGE_NAME, {
        _Signature_: {
            onglet: CREATE_DISCUSSION_TAB_ID
        },
        donnes: {
            contenu: message,
            objet: subject,
            listeDestinataires: recipientsPronote
        }
    })
}

async function getDiscussions(session, user)
{
    const discussions = await navigate(session, user, DISCUSSIONS_PAGE_NAME, DISCUSSIONS_TAB_ID, ACCOUNTS, {
        avecLu: true,
        avecMessage: true,
        possessionMessageDiscussionUnique: null
    });

    return parse(discussions.listeMessagerie, ({ estUneDiscussion, nombreMessages, objet, listePossessionsMessages,
        nbPublic, destinatairesMessage, initiateur, lu, libelleDate, messagePourParticipants, avecModifObjet }) => {
        if (!estUneDiscussion) {
            return null;
        }
        return {
            isDiscussion: estUneDiscussion,
            messagesCount: nombreMessages,
            subject: objet,
            nbPublic,
            recipients: parse(destinatairesMessage),
            author: initiateur,
            isRead: lu,
            strDate: libelleDate,
            id: parse(messagePourParticipants).id,
            messages: parse(listePossessionsMessages),
            withModifiedSubject: avecModifObjet
        }
    });
}


async function getDiscussion(session, user, discussionId)
{
    if (typeof discussionId === 'object') {
        discussionId = discussionId.pronoteId ?? discussionId.id;
    }

    const discussions = await getDiscussions(session, user);

    const discussionObject = discussions.find(d => d.id === discussionId);


    const discussion = await navigate(session, user, DISCUSSION_PAGE_NAME, DISCUSSION_TAB_ID, ACCOUNTS, {
        estNonPossede: false,
        listePossessionsMessages: discussionObject?.messages.map(toPronote),
        message: { N: 0 },
        nbMessagesVus: 20,
        marquerCommeLu: false
    });

    return {
        ...discussionObject,
        messages: parse(discussion.listeMessages, ({
            contenu, estHTML, date, public_gauche: publicGauche,
            hint_gauche: hintGauche, emetteur, listeDocumentsJoints
        }) => ({
            content: parse(contenu),
            isHTML: estHTML,
            date: parse(date),
            author: publicGauche,
            authorHint: hintGauche,
            isClientSender: emetteur,
            attachments: parse(listeDocumentsJoints)
        }))
    }
}

module.exports = {
    getRecipients,
    createDiscussion,
    getDiscussions,
    getDiscussion
};

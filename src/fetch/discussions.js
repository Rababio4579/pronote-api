const { getFileURL } = require('../data/files');
const fromHTML = require('../data/html');
const { withId } = require('../data/id');

const { getDiscussions, getRecipients, createDiscussion, getDiscussion } = require('./pronote/discussions');


async function discussions(session, user)
{
    const discussions = await getDiscussions(session, user);
    if (!discussions) {
        return null;
    }

    return discussions.filter(d => d.isDiscussion).map(d => withId({
        pronoteId: d.id,
        subject: d.subject,
        messagesCount: d.messagesCount,
        recipients: d.recipients.map(r => r.name),
        author: d.author && !d.withModifiedSubject ? d.author : user.name,
        isRead: d.isRead,
        strDate: d.strDate,
        seeDiscussion: () => getDiscussion(session, user, d.id)
    }, ['pronoteId', 'subject']));
}

async function recipients(session, user)
{
    const recipients = await getRecipients(session, user);
    if (!recipients) {
        return null;
    }

    return recipients.filter(r => r.discussionOpen).map(r => {
        const data = withId({
            pronoteId: r.id,
            name: r.name,
            type: r.type,
            role: r.role,
            createDiscussion: r.discussionOpen
                ? (subject, message) => createDiscussion(session, user, subject, message, [r])
                : undefined
        }, ['pronoteId', 'name'])
        if (data.role === 'staff') {
            data.function = r.function.name;
        } else if (data.role === 'teacher') {
            data.subjects = r.subjects.map(s => ({ name: s.name, subSubjects: s.subSubjects ?? undefined }));
            data.isMainTeacher = r.isMainTeacher;
        }
        return data;
    });
}

async function newDiscussion(session, user, subject, message, recipients)
{
    const discussion = await createDiscussion(session, user, subject, message, recipients);
    if (!discussion) {
        return null;
    }
    return discussion;
}


async function seeDiscussion(session, user, discussionId)
{
    const discussion = await getDiscussion(session, user, discussionId);
    if (!discussion) {
        return null;
    }

    return {
        subject: discussion.subject,
        recipients: discussion.recipients.map(r => r.name),
        groupAuthor: discussion.author,
        messages: discussion.messages.map(m => ({
            content: m.isHTML ? fromHTML(m.content) : m.content,
            htmlContent: m.isHTML ? m.content : null,
            attachments: m.attachments?.map(a => ({
                name: a.name,
                url: getFileURL(session, a)
            })),
            date: m.date,
            author: m.isClientSender ? user.name : discussion.author,
            authorHint: m.isClientSender ? 'Moi' : m.authorHint
        }))
    }
}


module.exports = {
    discussions,
    recipients,
    newDiscussion,
    seeDiscussion
};

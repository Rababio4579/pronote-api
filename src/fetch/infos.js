const { getFileURL } = require('../data/files');
const fromHTML = require('../data/html');
const { withId, checkDuplicates } = require('../data/id');

const { getInfos } = require('./pronote/infos');

async function infos(session, user)
{
    const infos = await getInfos(session, user);
    if (!infos) {
        return null;
    }

    const result = [];

    for (const info of infos.infos)
    {
        const data = withId({
            pronoteId: info.id,
            date: info.date,
            title: info.name,
            author: info.author.name,
            category: info.category.name,
            read: info.read,
            content: fromHTML(info.questions[0].text),
            htmlContent: info.questions[0].text,
            files: info.questions[0].files.map(f => withId({
                name: f.name,
                url: getFileURL(session, f),
                type: f.type
            }, ['name']))
        }, ['date', 'title'])
        if (info.type === 'poll') {
            data.questions = info.questions.map(q => ({
                text: q.text,
                type: q.type,
                rank: q.rank,
                choices: q.choices.map(c => ({
                    text: c.name,
                    rank: c.rank,
                    isFree: c.isFree
                })),
                maxChoices: q.maxChoices,
                answer: {
                    values: q.answer.values,
                    freeValue: q.answer.freeValue,
                    hasAnswer: q.answer.hasAnswer,
                    waitForAnswer: q.answer.waitForAnswer
                }
            }))
            data.answerPoll = info.answerPoll;
        } else if (info.type === 'info') {
            data.markedAsRead = info.questions[0].answer.hasAnswer && info.questions[0].answer.waitForAnswer;
            data.markAsSee = info.markAsSee;
        }
        result.push(data);
    }

    checkDuplicates(result).sort((a, b) => a.date - b.date);

    return result;
}

module.exports = infos;

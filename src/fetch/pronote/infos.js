const parse = require('../../data/types');
const request = require('../../request');
const { toPronote } = require('../../data/objects');

const navigate = require('./navigate');

const PAGE_NAME = 'PageActualites';
const TAB_ID = 8;
const ACCOUNTS = ['student', 'parent'];

async function getInfos(session, user)
{
    const infos = await navigate(session, user, PAGE_NAME, TAB_ID, ACCOUNTS, {
        estAuteur: false
    });

    if (!infos) {
        return null;
    }

    return {
        categories: parse(infos.listeCategories, ({ estDefaut }) => ({
            isDefault: estDefaut
        })),
        infos: parse(
            infos.listeModesAff && infos.listeModesAff.length ? infos.listeModesAff[0]?.listeActualites : {},
            ({ dateDebut, elmauteur, listeQuestions, categorie, public: publique, lue, estInformation,
                estSondage, reponseAnonyme }) => ({
                date: parse(dateDebut),
                author: parse(elmauteur),
                questions: parse(listeQuestions, ({ texte, listePiecesJointes, rang, genreReponse, tailleReponse,
                    avecMaximum, nombreReponseMax, listeChoix, reponse }) => ({
                    text: parse(texte),
                    files: parse(listePiecesJointes),
                    rank: rang,
                    type: genreReponse,
                    maxSize: tailleReponse,
                    max: avecMaximum ? nombreReponseMax : null,
                    choices: parse(listeChoix, ({ rang, estReponseLibre }) => ({
                        rank: rang,
                        isFree: estReponseLibre
                    })),
                    answer: parse(reponse, ({ valeurReponse, valeurReponseLibre,
                        avecReponse, estReponseAttendue, reponduLe, N }) => ({
                        values: parse(valeurReponse),
                        freeValue: valeurReponseLibre,
                        hasAnswer: avecReponse,
                        waitForAnswer: estReponseAttendue,
                        answeredAt: parse(reponduLe),
                        id: N
                    }))
                })),
                category: parse(categorie),
                receiver: parse(publique),
                read: lue,
                type: estInformation ? 'info' : estSondage ? 'poll' : 'unknown',
                anonymous: reponseAnonyme,
                markAsSee: async () => await markInfoAsSee(session, user, this),
                answerPoll: async answers => await answerPoll(session, user, this, answers)
            })
        )
    };
}


async function markInfoAsSee(session, user, infoId)
{
    if (!infoId) {
        return null;
    } else if (typeof infoId === 'object') {
        infoId = infoId.pronoteId;
    }

    const infosData = await getInfos(session, user);
    const info = infosData.infos.find(info => info.pronoteId === infoId);

    return await request(session, 'SaisieActualites', {
        _Signature_: { onglet: TAB_ID },
        donnees: {
            listeActualites: [
                {
                    N: infoId,
                    L: info.name,
                    E: 2,
                    validationDirecte: true,
                    genrePublic: 4,
                    public: toPronote(info.receiver),
                    lue: true,
                    supprimee: false,
                    marqueLueSeulement: false,
                    saisieActualite: false,
                    listeQuestions: info.questions.map(question => ({
                        ...toPronote(question),
                        reponse: {
                            Actif: true,
                            avecReponse: question.answer.hasAnswer,
                            estReponseAttendue: question.answer.waitForAnswer,
                            valeurReponse: ''
                        }
                    }))
                }
            ]
        }
    });
}


async function answerPoll(session, user, pollId, answers)
{
    if (!pollId) {
        return null;
    } else if (typeof pollId === 'object') {
        pollId = pollId.pronoteId;
    }

    const infosData = await getInfos(session, user);
    const info = infosData.infos.find(info => info.pronoteId === pollId);

    return await request(session, 'SaisieActualites', {
        _Signature_: { onglet: TAB_ID },
        donnees: {
            listeActualites: [
                {
                    N: pollId,
                    L: info.name,
                    E: 2,
                    validationDirecte: true,
                    genrePublic: 4,
                    public: toPronote(info.receiver),
                    lue: true,
                    supprimee: false,
                    marqueLueSeulement: false,
                    saisieActualite: false,
                    listeQuestions: info.questions.map(question => {
                        const answer = answers.find(answer => answer.id === question.pronoteId);
                        const data = {
                            ...toPronote(question),
                            reponse: {
                                Actif: true,
                                avecReponse: question.answer.hasAnswer,
                                estReponseAttendue: question.answer.waitForAnswer,
                                valeurReponse: toPronote(answer.values),
                                valeurReponseLibre: answer.freeValue
                            }
                        }
                        if (question.answer.answeredAt) {
                            data.response = {
                                ...data.response,
                                reponduLe: toPronote(question.answer.answeredAt),
                                strRepondant: info.receiver.name,
                                estRepondant: true,
                                N: question.answer.id,
                                E: 2,
                                _validationSaisie: true
                            }
                        }
                        return data;
                    })
                }
            ]
        }
    });
}


module.exports = {
    getInfos,
    markInfoAsSee,
    answerPoll
};

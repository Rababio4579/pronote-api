const parse = require('../../data/types');
const request = require('../../request');

const navigate = require('./navigate');

const PAGE_NAME = 'PageCahierDeTexte';
const TAB_ID = 88;
const ACCOUNTS = ['student', 'parent'];
const MARK_DONE_NAME = 'SaisieTAFFaitEleve';

async function getHomeworks(session, user, fromWeek = 1, toWeek = null)
{
    if (!toWeek || toWeek < fromWeek) {
        toWeek = fromWeek;
    }

    const homeworks = await navigate(session, user, PAGE_NAME, TAB_ID, ACCOUNTS, {
        domaine: {
            _T: 8,
            V: `[${fromWeek}..${toWeek}]`
        }
    });

    if (!homeworks) {
        return null;
    }

    const result = parse(homeworks.ListeTravauxAFaire, ({
        descriptif, PourLe, TAFFait, niveauDifficulte, duree, cours, DonneLe,
        Matiere, CouleurFond, ListePieceJointe
    }) => ({
        description: parse(descriptif),
        lesson: parse(cours),
        subject: parse(Matiere),
        givenAt: parse(DonneLe),
        for: parse(PourLe),
        done: TAFFait,
        difficultyLevel: niveauDifficulte,
        duration: duree,
        color: CouleurFond,
        files: parse(ListePieceJointe)
    }));
    for (let i = 0; i < result.length; i++) { //  Add markAs function to each homework
        result[i].markAs = async done => {
            await markHomeworkAs(session, user, result[i].id, done)
        };
    }

    return result;
}

async function markHomeworkAs(session, user, homeworkId, done = true)
{
    if (!homeworkId) {
        return null;
    } else if (typeof homeworkId === 'object') {
        homeworkId = homeworkId.pronoteId;
    }
    return await request(session, MARK_DONE_NAME, {
        donnees: {
            listeTAF: [
                {
                    E: 2,
                    N: homeworkId,
                    TAFFait: done
                }
            ]
        },
        _Signature_: { onglet: TAB_ID }
    });
}

module.exports = {
    getHomeworks,
    markHomeworkAs
};

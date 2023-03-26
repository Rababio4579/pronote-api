const { getPeriodBy } = require('../data/periods');
const getReport = require('./pronote/report');

async function reports(session, user, period = null, type = null)
{
    const report = await getReport(session, user, getPeriodBy(session, period, type));
    if (!report) {
        return null;
    }

    if (report.message) {
        return {
            message: report.message
        }
    }

    return {
        studentClass: report.studentClass?.name,
        studentName: report.studentName?.name,
        studentAverage: report.studentAverage?.V,
        studentClassAverage: report.studentClassAverage?.V,
        globalComments: report.globalComments,
        teachersComments: report.teacherComments.map(comment => ({
            name: comment?.id,
            teachers: comment.teachers?.map(teacher => teacher?.name),
            color: comment?.color,
            studentAverage: comment.studentAverage?.V,
            studentClassAverage: comment.studentClassAverage?.V,
            minAverage: comment.minAverage?.V,
            maxAverage: comment.maxAverage?.V,
            comments: comment.comments?.map(c => c.name).filter(c => !!c)
        })),
        absences: report.absences
    };
}

module.exports = reports;

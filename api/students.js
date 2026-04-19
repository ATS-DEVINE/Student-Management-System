const { handleStudentsApi } = require('../lib/students-handler');

module.exports = async function studentsApi(req, res) {
    return handleStudentsApi(req, res);
};

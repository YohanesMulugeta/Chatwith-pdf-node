const AppError = require('./AppError');

const multerFilter = (req, file, cb) => {
  let error;
  switch (file.mimetype) {
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      req.type = 'doc';
      break;
    case 'application/msword':
      req.type = 'doc';
      break;
    case 'text/csv':
      req.type = 'csv';
      break;
    case 'application/pdf':
      req.type = 'pdf';
      break;
    // case value:
    //   break;

    default:
      error = new AppError('Not Pdf! Please upload only pdfs.', 400);
      break;
  }

  cb(error, req.type);
};

module.exports = multerFilter;

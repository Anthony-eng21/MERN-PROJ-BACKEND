const multer = require("multer");
const { v1: uuidv1 } = require("uuid");

//tells us what kind of file we're using
const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

//tell it where to store and which files to except
const fileUpload = multer({
  limit: 500000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype]; //dynamically extract what kind of type defined format this file is
      cb(null, uuidv1() + "." + ext); //generates random file name with the right extension and a unique generated id
    },
  }), //generates a driver
  fileFilter: (req, file, cb) => { //looks for non img files and filters them out 
    //retrieves our mimetype format or null for any non image format
    const isValid = !!MIME_TYPE_MAP[file.mimetype]; //double bang returns null or undefined to FALSE and true for valid type
    let error = isValid ? null : new Error("invalid mime type");
    cb(error, isValid);
  },
});

module.exports = fileUpload;

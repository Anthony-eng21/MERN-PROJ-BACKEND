class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); //add message prop from og Error
    this.code = errorCode; //makes code property for this object
  }
}

module.exports = HttpError;

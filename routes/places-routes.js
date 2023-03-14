//set up the middleware related to places logic
const express = require("express");
const { check } = require("express-validator"); //check method returns a new middleware for our middleware validation requirements

const placesControllers = require("../controllers/places-controller");
//object with a bnch of middlewares
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

//gives us a special object that can register middleware
const router = express.Router();

//individual place route for each user
router.get("/:pid", placesControllers.getPlaceById);

//binds creator field to this segment /:uid
//searches for multiple places under a user id
router.get("/user/:uid", placesControllers.getPlacesByUserId);

//ensures below requests/middleware need tokens and checks
//then block any other requests below and protects them
router.use(checkAuth);

router.post(
  "/",
  //Returns middleware that processes a single file associated with the given form field.
  fileUpload.single("image"),
  [
    //validation for creating a new place
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createPlace
); //this returns a middleware that checks if this title field is empty holy shit lol

router.patch(
  "/:pid",
  [check("title").not().isEmpty(), check("description").isLength({ min: 5 })],
  placesControllers.updatePlace
);

router.delete("/:pid", placesControllers.deletePlace);

//how to export logic in node js (this constant)
module.exports = router;

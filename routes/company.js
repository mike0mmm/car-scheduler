var express         = require("express");
var middleware      = require('../middleware');
var db              = require('../models');
var router          = express.Router();


// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  let d = new Date();
  let n = d.toLocaleString('it-IT');
  console.log('Time: ', n);
  next();
});

// GET - profile view for company
router.get("/:id", middleware.isUserSteward , function(req, res){
  
  db.User.findById(req.user.id).populate('company').exec(function(err, foundUser){
    if (err) { console.log(err); }
    
    res.render("company/profile", {user: foundUser, company: foundUser.company});
  });
});

// GET - Update route for company
router.get("/:id/edit", middleware.isUserSteward , function(req, res){
  
  db.User.findById(req.user.id).populate('company').exec(function(err, foundUser){
    if (err) { console.log(err); }
    
    res.render("company/update", {user: foundUser, company: foundUser.company});
  });
});



module.exports = router;
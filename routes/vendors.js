var express         = require("express");
var db              = require('../models');
var middleware      = require('../middleware');
var router          = express.Router();


// middleware that is specific to this router
router.use(function timeLog (req, res, next) {
  let d = new Date();
  let n = d.toLocaleString('it-IT');
  console.log('Time: ', n);
  next();
});

function dynamicSort(property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    };
}

//GET - General vendors route
router.get("/", middleware.isUserSteward, function(req, res){
  db.User.findById(req.user.id)
  .populate({ 
     path: 'company',
     populate: {
       path: 'vendors',
       model: 'Vendor'
     }
  }).exec(function(err, foundUser){
    if (err) { console.log(err); }
    
    db.Vendor.find({}, function(err, foundVendors){
      if (err) { console.log(err); }
      
      foundVendors.sort(dynamicSort('vendorID'));
      
      var vendorID = foundVendors.length > 0 ? (foundVendors[foundVendors.length-1].vendorID + 1) : 10;
      res.render('vendors/show',{vendors: foundUser.company.vendors, user: foundUser, vendorID:vendorID });
    });
  });
});  

//POST - User creation route
router.post("/", middleware.isUserSteward, function(req, res){
  var newVendor = new db.Vendor({
      name: req.body.name,
      address: req.body.address,
      vendorID: req.body.vendorID,
      personInfo: req.body.personInfo,
      phoneNumber: req.body.phoneNumber
  });
  console.log("New vendor: ", newVendor);
  
  db.Vendor.create(newVendor, function(err, createdVendor){
    if(err) { 
      console.log(err); 
      res.redirect("/");
    }
    
    db.User.findById(req.user.id).populate('company').exec(function(err, foundUser){
      if (err) { console.log(err); }
      
      // Need to find and update company with deleted user
      db.Company.findById(foundUser.company._id, function(err, foundCompany){
        if (err) { console.log(err); }

        foundCompany.vendors.push(createdVendor);
        foundCompany.save();
        createdVendor.company = foundCompany._id;
        createdVendor.save();
        
        console.log("### Added new user #####", newVendor);
        res.redirect("/company/" + foundCompany._id + "/vendors");
      });
    });
  });  
});

//GET - User card show route
router.get("/:id", middleware.isUserSteward, function(req, res){
  db.User.findById(req.params.id, function(err, foundUser){
    if (err) { console.log(err); }
      
    db.User.findById(req.user.id).populate('company').exec(function(err, currentUser){
      if (err) { console.log(err); }
      
      res.render('users/profile',{user:currentUser, driver: foundUser});
    });
  });
});

//GET - User update show route
router.get("/:id/edit", middleware.isUserSteward, function(req, res){
  
  db.Vendor.findById(req.params.id, function(err, foundVendor){
    if (err) { console.log(err); }
      
    db.User.findById(req.user.id).populate('company').exec(function(err, currentUser){
      if (err) { console.log(err); }
      
      res.render('vendors/update',{user:currentUser, vendor:foundVendor});
    });
  });
});

//PUT - User update route
router.put("/:id/edit", middleware.isUserSteward, function(req, res){
  var updatedVendor = {
      name: req.body.name,
      personInfo: req.body.personInfo,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber
  };
  
  
  db.Vendor.findByIdAndUpdate(req.params.id, updatedVendor, function(err, foundVendor){
    if (err) { console.log(err); }
      
    db.User.findById(req.user.id).populate('company').exec(function(err, currentUser){
      if (err) { console.log(err); }
      
      res.redirect("/company/" + currentUser.company._id + "/vendors");
    });
  });
});


//GET - Vendor route to update status 
router.get("/:id/change-status", function(req, res){
    
    db.Vendor.findById(req.params.id, function(err, vendor){
      if (err) {
        console.log(err);
      }
      
      console.log(vendor);
      
      vendor.currentStatus = vendor.currentStatus == 'enabled' ? vendor.currentStatus = 'disabled' : vendor.currentStatus = 'enabled';
      vendor.save();
      
      res.redirect("/company/" + vendor.company + "/vendors");
    });
    
});

//DELETE - User route to delete item 
router.delete("/:id", middleware.isUserSteward, function(req, res){
  
  db.User.findById(req.user.id).populate('company').exec(function(err, foundUser){
    if (err) { console.log(err); }
    
    // Need to find and update company with deleted vendor
    db.Company.findById(foundUser.company._id, function(err, foundCompany){
      if (err) { console.log(err); }

      var foundUserIndex = foundCompany.vendors.indexOf(req.params.id);
      if (foundUserIndex != -1) {
        foundCompany.vendors.splice(foundUserIndex, 1);
        foundCompany.save();
      }
      
      // After company was updated we will remove selected vendor
      db.Vendor.findByIdAndRemove(req.params.id, function(err, vendor){
        if (err) {
          console.log(err);
          res.redirect("/company/" + foundCompany._id + "/vendors");
        } else {
          res.redirect("/company/" + foundCompany._id + "/vendors");
        }        
      });
    });
  });
});

module.exports = router;
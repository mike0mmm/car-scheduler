var express                 = require("express"),
    bodyParser              = require("body-parser"),
    compression             = require('compression'),
    methodOverride          = require('method-override'),
    morgan                  = require('morgan'),
    mongoose                = require('mongoose'),
    passport                = require("passport"),
    LocalStrategy           = require("passport-local"),
    cloudinary              = require("cloudinary"),
    User                    = require('./models/user'),
    // flash                   = require('express-flash'),
    helmet                  = require('helmet'),
    dotenv                  = require('dotenv'),
    // schedule                = require('node-schedule'),
    // cronJobs                = require('./schedule/index'),
    sslRedirect             = require('heroku-ssl-redirect'),
    cookieParser            = require('cookie-parser'),
    pjson                   = require('./package.json'),
    // seedData                = require('./seeds/index'),
    app                     = express();

// Perform seed jobs in order to align with DB changes.
// seedData.addImageToUsers();
// seedData.addPromoData();

// Load environment variables from .env file
dotenv.load();

app.use(compression(9));

app.use(helmet());

app.use(sslRedirect(['production']));

// app.use(morgan('tiny'));

// Add version number from package.json
app.locals.version = pjson.version;

mongoose.Promise = global.Promise;
mongoose.connect(process.env.DATABASEURL);


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API, 
  api_secret: process.env.CLOUDINARY_SECRET 
});


// Requring routes
var mainRoutes      = require("./routes/main"),
    adminRoutes     = require("./routes/admin"),
    userRoutes      = require("./routes/users"),
    authRoutes      = require("./routes/auth"),
    rideRoutes      = require("./routes/ride"),
    companyRoutes   = require("./routes/company"),
    carRoutes       = require("./routes/car"),
    vendorRoutes    = require("./routes/vendors");


// Configure public folder for static files
if (process.env.ENV === 'production') {
    app.use(express.static(__dirname + "/public", { maxAge: 8640000000 }));
} else {
    app.use(express.static(__dirname + "/public", { maxAge: 0 }));
}

// Configure view engine
app.set("view engine","ejs");
app.locals.rmWhitespace = true;

app.use(methodOverride("_method"));

//Configure to use body-parser
app.use(bodyParser.urlencoded({extended: true}));

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});

//=========================
// Cookies configuration
//=========================

var expiryDate = new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000); // 2 month

app.use(require("express-session")({
    secret: "We made it!",
    resave: false,
    name: 'organiserSession',
    saveUninitialized: false,
    cookie: {
        expires: expiryDate
    }
}));

//=========================
// Passport configuration
//=========================

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//=========================
// END - Passport configuration
//=========================

app.use(cookieParser());

app.use("/", mainRoutes);
app.use("/admin", adminRoutes);
app.use("/company/:id/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/company/:id/rides", rideRoutes);
app.use("/company", companyRoutes);
app.use("/company/:id/cars", carRoutes);
app.use("/company/:id/vendors", vendorRoutes);


app.get('*', function(req, res){
   res.redirect('/404');
});

//=========================
// Cron jobs configuration
//=========================

// if (process.env.NODE_ENV === 'production') {
//     var monthly = schedule.scheduleJob({hour: 15, minute: 05, date: 1}, function(){
//         cronJobs.monthly();
//     });
// }

//=========================
// End - Cron job configuration
//=========================


// Production error handler
if (process.env.ENV === 'production') {
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(err.status || 500);
  });
}

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("=========================");
    console.log("All Servers has started!");
    console.log("=========================");
});

module.exports = app;  // for testing
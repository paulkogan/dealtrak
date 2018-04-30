'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('./prop3config');
const props = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false })

//all the auth stuff
const flash             = require('connect-flash-plus');
const crypto            = require('crypto');
const passport          = require('passport');
const LocalStrategy     = require('passport-local').Strategy;
const hbs = require('hbs');


const cookieParser = require('cookie-parser')
const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const bcrypt = require('bcrypt');

const pModel =  require('./props3-model');
const secret = "cat"
//var router = express.Router();  then call router.post('/')

  props.set('views', path.join(__dirname, 'views'));
  props.set('view engine', 'hbs');
  props.set('trust proxy', true);


  props.use(flash());
  props.use(cookieParser(secret));
  props.use(bodyParser.urlencoded({extended: true}))
  props.use(bodyParser.json());

  props.use(session({
      cookieName: 'props3sess',
      secret: secret,
      resave: true,
      //store: RedisStore,
      saveUninitialized: true,
      cookie : { httpOnly: true, expires: 60*60*1000 }
  }));
  props.use(passport.initialize());
  props.use(passport.session());
//app.use(passport.authenticate('session'));
  props.use('/static', express.static(__dirname + '/static'));
  //props.use(app.router);

let sessioninfo = "no session"
let userObj =
{
  "id":0,
  "firstname":"Log In",
  "lastname":"",
  "email":"",
  "password":"",
  "photo":"https://raw.githubusercontent.com/wilsonvargas/ButtonCirclePlugin/master/images/icon/icon.png",
  "access":0
}

const unitValue = 2.7

function calculatePortfolioValue (investments) {
          let expandInvest = [];
          var totalPortfolioValue = 0.00;
          //Object.keys(investments).forEach(function(key) {
          investments.forEach(function(item, key) {
                   expandInvest[key]= investments[key];
                   expandInvest[key].propValue = parseFloat(expandInvest[key].units*unitValue);
                   expandInvest[key].percent = parseFloat(investments[key].ownership)/10;
                   expandInvest[key].investorValue = parseFloat(expandInvest[key].propValue * (expandInvest[key].percent/100)).toFixed(2)
                   totalPortfolioValue += parseFloat(expandInvest[key].investorValue)
                  expandInvest[key].propValue = expandInvest[key].propValue.toFixed(2)
                  //console.log(expandInvest[key].id, investments[key].lastname, expandInvest[key].address, expandInvest[key].ownership)
             });

            return [expandInvest, totalPortfolioValue.toFixed(2)]

}



//============ ROUTES ======================




   props.get('/updateuser/', checkAuthentication, (req, res) => {
     if (req.session && req.session.passport) {
        userObj = req.session.passport.user;
      }

    //  pModel.getUser (req.params.id, (err, user) => {
    //          //err comes back but not results
    //          if (err) {
    //            console.log("Update User problem "+JSON.stringify(err));
    //          }
       res.render('updateuser', {
               userObj: userObj,
               updateendpoint: '/process_user_update'
       });

    //}); //end modelRead

  });  //end UPDATE request



     // process delete
     props.post('/process_user_update', urlencodedParser, (req, res) => {
            const data = req.body
            console.log("Just got form: "+JSON.stringify(data)+"<br>")
            //check if they entered the right old password
            //function authuser (email, password, done) {
            //pModel.authuser (username, password, (err, autheduser) => {

            var updatedUser =
            {
              "id":userObj.id,
              "firstname":data.firstname,
              "lastname":data.lastname,
              "email":data.email,
              "photo":data.photo
            }
            //hash the password
            bcrypt.genSalt(10, function(err, salt) {
               if (err) return err;
                   bcrypt.hash(data.newpass, salt, function(err, hash) {
                                 console.log("hashing "+err)
                     if (err) return err;
                     if (data.newpass === "") {
                            updatedUser.password = userObj.password;
                     } else updatedUser.password = hash;
                       console.log("\n\nHere is the New User + Password with hash: "+JSON.stringify(updatedUser))


                           pModel.updateUser (updatedUser, (err, status) => {
                                  //err comes back but not results
                                  if (err) {
                                    console.log("\n\nModel Update problem "+JSON.stringify(err));
                                  } else {
                                  req.flash('login', "Updated USER "+updatedUser.lastname+".  ")
                                  console.log("Updated  "+updatedUser.lastname+" with " +JSON.stringify(status));
                                  res.redirect('/home');
                                  }
                          });//updateuser
                  }); //hash
          }); //getSalt
   }); //===== END PROCESS USER UPDATE










props.get('/investors', checkAuthentication, (req, res) => {

        if (req.session && req.session.passport) {
           userObj = req.session.passport.user;
         }

        //get a list of all investors
        pModel.getAllInvestors( function(err, investors){
                  if (err) {
                        //next(err);
                        console.log("Investor problems "+err);
                        return;
                  }

                  let expandInvestors = investors
                  //call the recur function
                  doRecursionForInvestor(0, investors.length)

                  console.log("AFTER recur function")



                  function doRecursionForInvestor(investorIndex, tot) {
                          if (investorIndex < tot) {
                                    pModel.getPortfolioList(expandInvestors[investorIndex].id, function(err, investments){
                                            if (err) {
                                                  console.log("Boom! "+err);
                                                  return;
                                            }
                                            //let expandPortfolio = calculatePortfolioValue(investments)[0]  //dont need this
                                             expandInvestors[investorIndex].numOfDeals = investments.length;
                                             expandInvestors[investorIndex].totalPortfolioValue = calculatePortfolioValue(investments)[1]
                                             //console.log("IN RECURSION: "+ expandInvestors[investorIndex].id, expandInvestors[investorIndex].lastname, expandInvestors[investorIndex].totalPortfolioValue, expandInvestors[investorIndex].numOfDeals)
                                             //setTimeout(1000);
                                             doRecursionForInvestor(investorIndex+1, tot)

                                    }) //get portfolioList

                         } else {

                           //console.log("done recursion")
                           res.render('investors', {
                                   userObj: userObj,
                                   sessioninfo: "PW: "+userObj.password,
                                   message: req.flash('login') + "Showing "+investors.length+" investors.",
                                   investors: expandInvestors
                           });//render


                         }
                        //console.log("done with a loop")

                  }  // doRecursionForInvestor



      }); //getAllinvestors

}); //  /inevestors route




  props.get('/portfolio/:id', checkAuthentication, (req, res) => {

                     if (req.session && req.session.passport) {
                        userObj = req.session.passport.user;
                        console.log ("UserOBJ from Session "+JSON.stringify(userObj))
                      } else {
                           res.redirect('/login')
                           return
                      }



                      pModel.getPortfolioList(req.params.id, function(err, investments){
                            if (err) {
                                  //next(err);
                                  console.log("Boom! "+err);
                                  return;
                            }

                            let expandInvest = calculatePortfolioValue(investments)[0]
                            let totalPortfolioValue = calculatePortfolioValue(investments)[1]

                            res.render('portfolio', {
                                    userObj: userObj,
                                    message:  "Showing "+investments.length+" investments. " +req.flash('login'),
                                    portfolioOwner: investments[0].firstname + " "+investments[0].lastname,
                                    //portfolioOwner: "Jack",
                                    investments: expandInvest,
                                    totalPortfolioValue: totalPortfolioValue,
                                    xInv: JSON.stringify(expandInvest)
                            });

                      });

    }); //portfolio



  props.get('/properties', (req, res) => {

    if (req.session && req.session.passport) {
       userObj = req.session.passport.user;

     }


            pModel.getAllProps( function(err, properties, cursor){
                  if (err) {
                        //next(err);
                        console.log("Boom! "+err);
                        return;
                  }

          let expandProperties = []
          properties.forEach(function(item, key) {
          //Object.keys(properties).forEach(function(key) {
               expandProperties[key]= properties[key];
               expandProperties[key].propValue = (expandProperties[key].units*unitValue).toFixed(2);;
               console.log(expandProperties[key].id, expandProperties[key].address)
             });



                  res.render('list', {
                          userObj: userObj,
                          sessioninfo: "PW:" + userObj.password,
                          message: req.flash('login') + "Showing "+properties.length+" properties.",
                          properties: expandProperties
                  });

            });
    }); //proprties



    props.get('/view/:id', checkAuthentication, (req, res) => {

            if (req.session && req.session.passport) {
                 userObj = req.session.passport.user;
             }

            sessioninfo = JSON.stringify(req.session);


            pModel.read (req.params.id, (err, entity) => {
                    //err comes back but not results
                    if (err) {
                      console.log("Props2: View problem "+JSON.stringify(err));
                    }


                    let expandProperty = entity
                    expandProperty.propValue = (expandProperty.units*unitValue).toFixed(2);;


                    res.render('viewprop', {
                            property: expandProperty,
                            userObj: userObj,
                            sessioninfo: sessioninfo,
                            message: req.flash('login'),

                    });


            });

      });   // END VIEW =========


  props.get('/home', (req, res) => {

    if (req.session && req.session.passport) {
       userObj = req.session.passport.user;
     }


      let menuOptions = []
      menuOptions[0] = {name:"Properties", link:"/properties"}
      menuOptions[1] = {name:"Investors", link:"/investors"}
      menuOptions[2] = {name:"Add Property", link:"/addprop"}
      menuOptions[3] = {name:"Add Investor", link:"/home"}

      res.render('home', {
              userObj: userObj,
              message: req.flash('login'),
              menuoptions: menuOptions
      });

  });


props.get('/login', (req, res) => {
        res.render('login', {
                postendpoint: '/checklogin',
                message: req.flash('login')
        });
});


// Note that when using a custom callback, it becomes the application's
// responsibility to establish a session (by calling req.login()) and send a response.

props.post('/checklogin', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {

    if (err) { return next(err); }

    //if you did not get a user back from Strategy
    if (!user) {
      req.flash('login', 'Credentials could not be verified, please try again.')
      return res.redirect('/login');
    }
    //found user
    req.logIn(user, function(err) {
          if (err) {
            req.flash('login', 'Login problem '+err)
            return next(err);
          }


      console.log('START OF SESSION for user '+user.id+" sending to "+req.session.return_to)
      req.flash('login', 'Login success: '+req.session.passport.user.email); //does not work yet
      //req.session.user = user; //put user object in session - dont need this

      //on first login, use this to redirect
      if (req.session.return_to) {
            return res.redirect(req.session.return_to);  //WORKS?
      } else return res.redirect("/");

      //return res.redirect(url);

    });
  })(req, res, next);
});



//trying HBS page
props.get('/', function(req, res) {
     res.redirect('/home')

}); // END LIST =============



props.get('/delete/:id', checkAuthentication, (req, res) => {
  pModel.read (req.params.id, (err, entity) => {
          //err comes back but not results
          if (err) {
            console.log("Props3: del request problem "+JSON.stringify(err));
          }
    res.render('delprop', {
            title: 'Delete a Property',
            property: entity,
            deleteendpoint: '/process_delete'
    });

 }); //end modelRead

});  //end DELETE request



  // process delete
  props.post('/process_delete', urlencodedParser, (req, res) => {
        const data = req.body
        //res.send("Just got: "+JSON.stringify(data)+"<br>")
        if (data.del_response.toLowerCase() === "yes") {
             pModel.delete (data.id, (err, results) => {
                    //err comes back but not results
                    if (err) {
                      console.log("Props2: Delete problem "+JSON.stringify(err));
                    } else { //deleted OK
                    //res.send("Deleted Property ID "+data.id);
                    req.flash('login', "Deleted Property "+data.id+".  ")
                    res.redirect('/properties');
                    }

            });
        } else  {
              res.redirect('/properties');
        }


}); //===== END PROCESS DELETE




props.get('/addprop', checkAuthentication, (req, res) => {
  if (req.session && req.session.passport) {
     userObj = req.session.passport.user;
   }


        res.render('addprop', {
                userObj: userObj,
                postendpoint: '/process_add'
        });
});



  // insert the new property
props.post('/process_add', urlencodedParser, (req, res) => {
    const data = req.body
    pModel.create(data, (err, savedData) => {
      if (err) {
        //next(err);
        console.log("Boom! "+err);
      }

      req.flash('login', "Added property: "+savedData.address)
      res.redirect('/properties');
    });
  });


// Basic 404 handler
props.use((req, res) => {
  res.status(404).send('404 Props Not Found at '+req.url);
});


  // Start the server
  const server = props.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log('props listening on port  ' + port);
  });


module.exports = props;


//========== passport STRATEGY =========


passport.use(new LocalStrategy(
  {
    passReqToCallback: true
  },
  (req, username, password, done) => {
         pModel.authuser (username, password, (err, autheduser) => {
                 //err comes back but not results
                 if (err) {
                   console.log("call to model is err "+JSON.stringify(err));
                   //req.flash('login', 'strategy: bad user name or password')
                   return done(null, false);
                 }
                 if (!autheduser) {
                        console.log("strategy: user "+ username +" not found ");
                        return done(null, false);
                 }
                 console.log("OK autheduser is "+autheduser.firstname);
                 return done(null, autheduser);

          }) //loginuser


})) //localstrategy



    passport.serializeUser(function(user, done){
        done(null, user);  //save user or just user.id in session
    });

    passport.deserializeUser(function(user, done){
        //connection.query("select * from tbl_users where id = "+ id, function (err, rows){
            done(null, user);

    });


      // User found - check passwpord
      // bcrypt.compare(checkpass, user.password, (err, isValid) => {
      // }) //bcrypt

//NOT FIRST TIME LOGIN
function checkAuthentication(req,res,next){
          if (userObj.id == 0) {
               req.session.return_to = "/";
          } else {
               req.session.return_to = req.url;
          }

          if(req.isAuthenticated()){
                 console.log("YES, authenticated"+req.url)
                 //req.flash('login', 'checkAuth success')
                 return next();
                 //res.redirect(req.url);

          } else {
              console.log("NO, not authenticated"+req.url)
              //req.flash('login', 'checkAuth failed, need to login')
              res.redirect("/login");
          }
}

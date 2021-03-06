
'use strict';

const extend = require('lodash').assign;
const mysql = require('mysql');
const config = require('./prop3config');
const bcrypt = require('bcrypt');

let options = {};



if (config.get('NODE_ENV') === 'ebaws') {
        options = {
          user: 'propsDB',
          password: config.get('MYSQL_PASSWORD'),
          host: 'aa1q3akhb3ona6q.cdlgrjtshtb6.us-east-2.rds.amazonaws.com',
          database: 'ebdb',
          port: 3306
        };
}

//tried but not working
if (config.get('NODE_ENV') === 'ebawsfromGC') {
        options = {
          user: 'propsDB',
          password: config.get('MYSQL_PASSWORD'),
          host: "18.216.80.132",
  //        host: 'aa1q3akhb3ona6q.cdlgrjtshtb6.us-east-2.rds.amazonaws.com',
          database: 'ebdb',
          port: 3306
        };
}

if (config.get('NODE_ENV') === 'dtgc-local') {
        options = {
          user: "dealsDBadmin",
          password: config.get('MYSQL_PASSWORD'),
          //host: "35.227.22.191",
          database: "dtgc",
          //socketPath: '/cloudsql/dealtrak-202821:us-east1:dealtrak-db'
          //port: 3306
        };
}

if (config.get('NODE_ENV') === 'dtgc-prod') {
        options = {
          user: "dealsDBadmin",
          password: config.get('MYSQL_PASSWORD'),
          //host: "35.227.22.191",
          database: "dtgc"
          //socketPath: '/cloudsql/dealtrak-202821:us-east1:dealtrak-db'
          //port: 3306
        };
}




//  options.socketPath = `/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}`;

const connection = mysql.createConnection(options);

connection.connect(function(err) {
      if (err) {
            console.error('error connecting: ' + err.stack);
            return;
      } else {
            console.log('connected as id ' + connection.threadId+"to ");
      }
});


function authuser (email, password, done) {
  connection.query(
    'SELECT * FROM users WHERE email = ?', email,  (err, results) => {
      if (!err && !results.length) {
              done("Not found "+ email+" got "+err, null);
              return;
      }

      if (err) {
        done("Search error" +err, null);
        return;
      }

     let checkPlainPW = (password === results[0].password)
     //res is result of comparing encrypted apsswords
     bcrypt.compare(password, results[0].password, function(err, res) {
                   if (err) {
                     console.log("PW auth error" +err)
                     done("PW auth error" +err, null);
                     return;
                   }
                  if (!(checkPlainPW) && !(res) ) {
                      console.log("\nbad pw "+password+", res is: "+res+"   checkPlainPW is: "+checkPlainPW)
                      done("bad password", null)
                      return
                  }
                console.log(results[0].firstname+" has authed in authuser");
                done(null, results[0]);
    }); //chaeckHashPW
  } //cb function
 ) //connection querty
} //authuser


function updateuser (updateuser, done) {
    console.log("\n\nHere at update: email:"+ updateuser.email +" PW:"+updateuser.password+" ID:"+updateuser.id)
    connection.query(
        'UPDATE users SET email = ?, photo =?, password=? WHERE id=?',
        [updateuser.email, updateuser.photo, updateuser.password, updateuser.id],
        function(err, status)  {
                if (err) {
                  done(err, null);
                  return;
                }
                done(null, status.affectedRows);
    }); //connection.query
  } //updateuser





function finduser (email, cb) {
  connection.query(
    'SELECT * FROM users WHERE email = ?', email,  (err, results) => {
      if (!err && !results.length) {
              cb("Not found "+ email+" got "+err);
              return;
      }

      if (err) {
        cb("Search error" +err);
        return;
      }
      cb(null, results[0]);
    });
}

function getportfoliolist (user_id, done) {
  connection.query(
    'SELECT u.firstname, u.lastname, p.address, p.zip, p.id, p.units, i.ownership from investments as i'
    +' JOIN users as u ON u.id = i.user_id'
    +' JOIN reprops as p ON p.id = i.prop_id WHERE user_id = ?',user_id,
    function(err, results)  {
              if (err) {
                done(err, null);
                return;
              }
              done(null, results);
    }
  );
}


function getinvestorlist (property_id, done) {
     connection.query(
        'SELECT u.id as user_id, u.firstname, u.lastname, i.ownership as ownership, u.photo  from investments as i'
        +' JOIN users as u ON u.id = i.user_id'
        +' JOIN reprops as p ON p.id = i.prop_id WHERE prop_id = ?',property_id,
        function(err, results)  {
                  if (err) {
                    done(err, null);
                    return;
                  }
                  done(null, results);
     });//connectionquery
} //getinvestorlist




// [START get allprops]
function getallprops (cb) {
  connection.query(
    'SELECT * FROM reprops',  function(err, results) {
              if (err) {
                cb(err);
                return;
              }
              //const hasMore = false;
              //wow, you just invoke the CB function to return results
              cb(null, results, false);
    }
  );
}

// [START get allinvestors]
function getallinvestors (cb) {
  connection.query(
    'SELECT u.id, u.firstname, u.lastname, u.email, u.photo'
    +' from users as u WHERE u.access < 4',  function(err, results) {
              if (err) {
                cb(err);
                return;
              }
              cb(null, results);
    }
  );
}



// [START create]
function create (data, cb) {
  console.log("the new property is: "+JSON.stringify(data))
  connection.query('INSERT INTO reprops SET ?', data, (err, res) => {
    if (err) {
      console.log("bad insert"+err)
      cb(err);
      return;
    }

   read(res.insertId, cb);

  });
}
// [END create]

function  _delete (id, cb) {
  connection.query('DELETE FROM reprops WHERE id = ?', id, (err, results) => {
      if (err) {
        console.log("bad delete "+err)
        cb(err);
        return;
      }
      console.log("Delete results in model are: "+JSON.stringify(results))
      cb(null, results)
  });

}


function read (id, cb) {
  connection.query(
    'SELECT * FROM reprops WHERE id = ?', id,  (err, results) => {
      if (!err && !results.length) {
        err = {
          code: 404,
          message: 'Id '+id+' not found in Listings'
        };
      }

      if (err) {
        cb("Search error" +err);
        return;
      }
      cb(null, results[0]);
    });
}



module.exports = {
  //createSchema: createSchema,
  findUser: finduser,
  authUser: authuser,
  updateUser: updateuser,
  getAllProps: getallprops,
  getAllInvestors:  getallinvestors,
  getInvestorList:getinvestorlist,
  getPortfolioList: getportfoliolist,
  create: create,
  read: read,
  delete: _delete
};

if (module === require.main) {
  const prompt = require('prompt');
  prompt.start();

  console.log("Running this script directly will allow you to initialize your mysql database. This script will not modify any existing tables.");

  prompt.get(['user', 'password'], (err, result) => {
    if (err) {
      return;
    }
    //createSchema(result);
  });
}

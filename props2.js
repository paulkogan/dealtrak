'use strict';

const path = require('path');
const express = require('express');
const config = require('./prop2config');
const props = express();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false })



props.set('views', path.join(__dirname, 'views'));
props.set('view engine', 'hbs');
props.set('trust proxy', true);
props.use('/static', express.static(__dirname + '/static'));
const pModel =  require('./model-props2');


var globalmessage = null

props.get('/', (req, res) => {
    globalmessage = null;
    res.redirect('/list');
  });

  //list all properties
  props.get('/props', (req, res) => {
      res.redirect('/list');

  });

//trying HBS page
props.get('/list', function(req, res) {

    pModel.list( function(err, entities, cursor){
          if (err) {
                //next(err);
                console.log("Boom! "+err);
                //return;
          }

          res.render('list', {
                  message: globalmessage,
                  properties: entities,
                  addform: '/add'
          });

   });
}); // END LIST =============


props.get('/view/:id', (req, res) => {
        globalmessage = null
        pModel.read (req.params.id, (err, entity) => {
                //err comes back but not results
                if (err) {
                  console.log("Props2: View problem "+JSON.stringify(err));
                }

                //res.send("View: "+entity.address.toString())

                res.render('viewprop', {
                        title: 'View Property Details',
                        property: entity,
                        addform: '/add'
                });


        });

  });   // END VIEW =========


props.get('/delete/:id', (req, res) => {
  pModel.read (req.params.id, (err, entity) => {
          //err comes back but not results
          if (err) {
            console.log("Props2: del request problem "+JSON.stringify(err));
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
                    globalmessage = "Deleted Property "+data.id
                    res.redirect('/list');
                    }

            });
        } else  {
              res.redirect('/list');
        }


}); //===== END PROCESS DELETE






props.get('/add', (req, res) => {
        globalmessage = null
        res.render('addprop', {
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
      //res.redirect(`${req.baseUrl}/${savedData.id}`);
      globalmessage = "Added property: "+savedData.address
      res.redirect('/list');
    });
  });





// Basic 404 handler
props.use((req, res) => {
  res.status(404).send('404 Not Found');
});


  // Start the server
  const server = props.listen(config.get('PORT'), () => {
    const port = server.address().port;
    console.log(`props listening on port ${port}`);
  });


module.exports = props;

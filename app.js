//.  app.js
var express = require( 'express' ),
    cfenv = require( 'cfenv' ),
    fs = require( 'fs' ),
    app = express();

app.get( '/', function( req, res ){
  var hostname = fs.readFileSync( '/etc/hostname' );
  fs.readFile( '/etc/hostname', "utf-8", function( err, text ){
    if( err ){
      var p = JSON.stringify( err, null, 2 );
      res.contentType( 'application/json; charset=utf-8' );
      res.status( 400 );
      res.write( p );
      res.end();
    }else{
      res.contentType( 'text/plain; charset=utf-8' );
      res.write( text );
      res.end();
    }
  });
});

var appEnv = cfenv.getAppEnv();
var port = appEnv.port || 3000;
app.listen( port );
console.log( "server starting on " + port + " ..." );

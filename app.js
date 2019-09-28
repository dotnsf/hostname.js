//.  app.js
var express = require( 'express' ),
    fs = require( 'fs' ),
    jwt = require( 'jsonwebtoken' ),
    OAuth = require( 'oauth' ),
    request = require( 'request' ),
    session = require( 'express-session' ),
    settings = require( './settings' ),
    app = express();
var RedisStore = require( 'connect-redis' )( session );

app.use( express.static( __dirname + '/public' ) );

var store = new RedisStore({
  port: settings.redis_port,
  host: settings.redis_hostname,
  prefix: 'sid:'
});
app.use( session({
  secret: settings.superSecret,
  resave: false,
  saveUnintialized: false,
  store: store,
  cookie: {
    path: '/',
    //httpOnly: true,
    secure: false,
    maxage: 1000 * 60 * 60 * 24 * 30  //. 30 days
  }
}));

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );


//. Twitter API
var oa = new OAuth.OAuth(
  'https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  settings.twitter_consumer_key,
  settings.twitter_consumer_secret,
  '1.0A',
  null,
  'HMAC-SHA1'
);

app.get( '/twitter', function( req, res ){
  oa.getOAuthRequestToken( function( err, oauth_token, oauth_token_secret, results ){
    if( err ){
      console.log( err );
      res.redirect( '/' );
    }else{
      req.session.oauth = {};
      req.session.oauth.token = oauth_token;
      req.session.oauth.token_secret = oauth_token_secret;
      res.redirect( 'https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token );
    }
  });
});

app.get( '/twitter/callback', function( req, res ){
  if( req.session.oauth ){
    req.session.oauth.verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;
    oa.getOAuthAccessToken( oauth.token, oauth.token_secret, oauth.verifier, function( err, oauth_access_token, oauth_access_token_secret, results ){
      if( err ){
        console.log( err );
        res.redirect( '/' );
      }else{
        req.session.oauth.provider = 'twitter';
        req.session.oauth.user_id = results.user_id;
        req.session.oauth.screen_name = results.screen_name;

        var token = jwt.sign( req.session.oauth, settings.superSecret, { expiresIn: '25h' } );
        req.session.token = token;
        res.redirect( '/' );
      }
    });
  }else{
    res.redirect( '/' );
  }
});

app.post( '/logout', function( req, res ){
  req.session.token = null;
  //res.redirect( '/' );
  res.write( JSON.stringify( { status: true }, 2, null ) );
  res.end();
});



app.get( '/', function( req, res ){
  var hostname = fs.readFileSync( '/etc/hostname' );
  fs.readFile( '/etc/hostname', "utf-8", function( err, text ){
    if( err ){
      console.log( err );
      res.render( 'index', { status: false, user: null, hostname: JSON.stringify( err ) } );
    }else{
      if( req.session && req.session.token ){
        var token = req.session.token;
        jwt.verify( token, settings.superSecret, function( err, user ){
          res.render( 'index', { status: true, user: user, hostname: text } );
        });
      }else{
        res.render( 'index', { status: true, user: null, hostname: text } );
      }
    }
  });
});

app.get( '/profileimage', function( req, res ){
  var screen_name = req.query.screen_name;
  if( screen_name ){
    var option = {
      url: 'https://twitter.com/' + screen_name + '/profile_image?size=original',
      method: 'GET'
    };
    request( option, ( err0, res0, body0 ) => {
      if( err0 ){
        return res.status( 403 ).send( { status: false, error: err0 } );
      }else{
        res.redirect( 'https://pbs.twimg.com' + res0.request.path );
      }
    });
  }else{
    return res.status( 403 ).send( { status: false, error: 'No screen_name provided.' } );
  }
});

var port = process.env.PORT || 3000;
app.listen( port );
console.log( "server starting on " + port + " ..." );

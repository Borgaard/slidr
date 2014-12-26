var express         = require('express');
var app             = express();
var db              = require('./db.js')
var ejs             = require('ejs');
var passport        = require('passport');
var passportgithub = require('passport-github');
var async           = require('async');
var request         = require('request');
var bodyParser      = require('body-parser');
var _               = require('underscore');
var atob            = require('atob');
var markdown        = require('markdown').markdown;
var githubauth      = require('./githubauth.js');
var session         = require('express-session');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded());
app.use(express.static(__dirname + '/'));
app.use(function(req, res, next) {
	console.log(new Date(), req.originalUrl, req.ip, req.body.github_username);
	next();
});
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new passportgithub.Strategy({
    clientID: githubauth.client_id,
    clientSecret: githubauth.secret_id,
    callbackURL: "http://whygaard.com/githubauth"
  },
  function(accessToken, refreshToken, profile, done) {
    //console.log(accessToken, refreshToken, profile);
    db.query("INSERT INTO users (github_username) VALUES ($1)", [profile.username], function(err, dbRes) {
    if (err) {
      console.log(err);
    }
        db.query("SELECT * FROM users WHERE github_username = $1", [profile.username], function(err, dbRes) {
          if (err) {
            console.log(err);
          }
          var user_id = dbRes.rows[0].id;
          done(null, { github_username: profile.username, user_id: user_id });
        });
  });
    // User.findOrCreate({ githubId: profile.id }, function (err, user) {
    //   return done(err, user);
    // });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.get('/', function(req, res) {
	res.render('index');
});

app.get('/users/new', function(req, res) {
	var options = {
		url: 'https://api.github.com/users/'+req.body.github_username+'/repos', 
		headers: { 'User-Agent': 'request' }
	};
	request(options,function(error, response, body) {
		var user = req.session.passport.user; //I was totally going to find and replace all the req.bodies for this
		if(!error) {
					var repos = JSON.parse(body); //gets all ze repos
					var repoNames = _.pluck(repos, 'full_name'); // displays all ze names of repos
					res.redirect('/users/'+user.github_username);
					// Begin asyncronous madness!
					//db.query("SELECT id FROM users WHERE github_username = $1", [user.github_username], function(err, dbRes) {
					//	var user_idFROMusers = dbRes.rows[0].id;
					//	console.log(user_idFROMusers); }
						async.each(repoNames, function(name, next) { //name is repo name. next means done with callback
							var readmeurls = {
								url: 'https://api.github.com/repos/'+name+'/readme',
								headers: { 'User-Agent': 'request' }
							};
							request(readmeurls, function(error, response, body) {
								if(error) {
									console.log(error);
								}
								var readmeData = JSON.parse(body); //different than repos variable. is basically curl readme.
								db.query("INSERT INTO readmes (user_id, repo, readme_content) VALUES ($1, $2, $3)", [user.id, name, readmeData.content], function(err, dbRes) {
									if(err) {
										console.log(err);
									}
								});
							});
						}, function(error) {
							if(error) {
								console.log(error);
							}
						});
		}
	});
});

app.get('/users/:github_username', function(req, res) {
	res.render('profile', { user: req.session.passport.user }); // start presentation button of all repos

});

app.get('/users/:github_username/presentation', function(req, res) {
	db.query("SELECT * FROM users WHERE github_username = $1", [req.params.github_username], function(err, dbRes) {
		if(err) {
			console.log(err);
		}
		var user_id = dbRes.rows[0].id;
		db.query("SELECT * FROM readmes WHERE user_id = $1", [user_id], function(err, dbRes) {
			if(err) {
				console.log(err);
			}
			var atobreadmes = [];
			for(var i = 0; i<dbRes.rows.length; i++) {
				if(dbRes.rows[i].readme_content) {
					atobreadmes.push(markdown.toHTML(atob(dbRes.rows[i].readme_content)));
				}
			};
			// console.log(atobreadmes);
			res.render('presentation', { slides: atobreadmes });
		});
	});
});

app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

app.get('/githubauth', 
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/users/new');
  });




















// app.get('/views/remoteActive', function(req, res) {
// 	res.send("Remote: remoteActive");
// });





app.listen(80, function() {
	console.log("Listening on 80!");
});





/*
https://slidr.herokuapp.com/ | https://git.heroku.com/slidr.git

TODO:
create repo table
save repo names into repo table
 
post/signup take array of repo names, loop over them

restful routing
alter users, add admin column that defaults to false
on applicable pages, do ejs if/else statement if(user.admin), if user is admin, display delete/edit option buttons in front end
in controller, where app.delete('/posts/id') {
	if (req.user.admin) {
	delete
} else {
	redirect
}
&&/||
user.id = poster's user.id






DATABASE slidr
TABLE users
(id, username, github_username, password) + admin[default:f]
TABLE readmes
(id, user_id, repo, readme_content)


create session routing............. ugh




https://www.npmjs.com/package/async#each
view-source:http://ironsummitmedia.github.io/startbootstrap-simple-sidebar/
http://ironsummitmedia.github.io/startbootstrap-simple-sidebar/
https://github.com/npm/slide-flow-control

*/






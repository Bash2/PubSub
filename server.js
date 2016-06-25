var http = require('http');
var express = require('express');
var faye = require('faye');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser')

var app = express();
var secret = "Archii-9b162e86-3c31-46ef";

var userData = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.post('/api/login', function (req, res) {
    var response = {};
    if (req.body.username) {
        var user = new Object();
        user.username = req.body.username;
        
        response.status = 'success';
        response.token = jwt.sign(user, secret, {expiresIn: '1d'});
        res.send(response);
    } else {
        response.status = 'error';
        response.error = "Required parameters missing";
        res.send(response);
    }
});

app.get('/publish.html', function (req, res, next) {
    if (req.query.token) {
        jwt.verify(req.query.token, secret, function (err, decoded) {
            if (!err) {
                next();
            } else {
                res.status(403);
                res.send("Invalid token");
            }
        });
    } else {
        res.status(403);
        res.send("Token required to login");
    }
});
app.use('/', express.static('public'));

var server = http.createServer(app);
var bayeux = new faye.NodeAdapter({ mount: '/api/topics', timeout: 45 });

var authentication = {
    incoming: function (message, callback) {
        if (!message.channel.match(/^\/meta\//)) {
            if (message.data.token) {           
                jwt.verify(message.data.token, secret, function (err, decoded) {
                    if (!err) {
                        message.data.username = decoded.username;
                        delete message.data.token;
                        return callback(message);
                    } else {
                        message.token = 'Invalid or expired token';
                        return callback(message);
                    }
                });
            } else {
                message.error = "Token required to publish";
                return callback(message);
            }
        } else {
            return callback(message);
        } 
    }
}
bayeux.addExtension(authentication);
bayeux.attach(server);

server.listen(8000);
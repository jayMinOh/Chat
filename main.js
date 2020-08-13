const express = require('express'),
 path = require('path'),
 app = express(),
 http = require('http').createServer(app),
 io = require('socket.io')(http),
 session = require('express-session'),
 redis = require('./redis.js'),
 redisStore = require('connect-redis')(session),
 mysql = require('mysql'),
 swig = require('swig'),
 extend = require('extend'),
 conf = require('./conf/app_conf.json');
 const multer = require('multer'); 
 const storage = multer.diskStorage({ 
                        destination(req, file, callback) {
                             callback(null, 'uploads'); 
                        }, 
                        filename(req, file, callback) { 
                            let array = file.originalname.split('.'); 
                            array[0] = array[0] + '_'; 
                            array[1] = '.' + array[1];
                            array.splice(1, 0, Date.now().toString()); 
                            const result = array.join(''); 
                            req.file_name = result;
                        callback(null, result); } 
                });
const upload = multer({ storage});
const pool = mysql.createPool(conf.DBINFO);
const user = require('./routes/user');

var bodyParser = require('body-parser');

app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.engine('.html', swig.renderFile);
app.set('view cache', false);
swig.setDefaults({cache : false});

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false}));
app.use(express.static(path.join(__dirname + '/public')));
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(session({
    secret : 'secret_key',
    store : new redisStore(extend(conf.REDISINFO, {}, {"client": redis})),
    saveUninitialized : false,
    resave : true,
    cookie : {
        maxAge : 1000 * 60 * 30
    }
}));

app.use('/', function(req, res, next){
    if (req.url.indexOf('login') > 0 ) {
        pool.getConnection(function(error, connection){
            if (error) {
                connection.release();
                res.json("error");
                return;
            } 
            res.db = connection;
            next();
        });
    } else if (req.url.indexOf('json') > 0) {
        if (req.url.indexOf('signup') > 0|| req.url.indexOf('checkDupl') > 0 || req.session.key) {
            pool.getConnection(function(error, connection){
                if (error) {
                    connection.release();
                    res.json("error");
                    return;
                } 
                res.db = connection;
                next();
            });
        } else {
            res.render('index');
            next();
        }   
    } else {
       next();
    } 
});

app.get('/', function(req, res){
    res.render('index');
});

app.post('/checkDupl.json', user.checkDupl);
app.post('/signup.json', upload.array('USER_IMG', 1), user.addUser);
app.post('/login.json', user.login);
app.get('/logout.do', user.logout);
app.get('/signup.do', function(req, res) {
    res.render('signup');
});
app.get('/chat.do', function(req, res) {
    if (req.session.key) {
        console.log(req.session)
        res.render('chat',{ USER_ID : req.session.USERINFO.USER_ID,
            USER_IMG : req.session.USERINFO.USER_IMG,
            USER_LANG_TYPE: req.session.USERINFO.USER_LANG_TYPE,
            USER_NAME: req.session.USERINFO.USER_NAME});    
    } else {
        res.render('index');
    }
});

io.on('connection', (socket) => {
    socket.on('chat message', (obj) => {
      console.log("server msg: " , obj.msg , ", userId:" , obj.id)
      io.emit('chat message', obj);
    });
    socket.on('disconnect', (req, res) => {
      console.log('user disconnected');
    });
});

http.listen(conf.PORT, () => {
    console.log('Connected at ' + conf.PORT);
});
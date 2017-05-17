//expressの呼び出し

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const routes = require('./routes/index');
const users = require('./routes/users');

const five = require('johnny-five');
const pcm = require('pcm');


const DashButton = require("dash-button");
const request = require('request');
const exportComponent = require('./exportFunction.js');
const keycodeMap = require ('./lib/keyCode.json');
const videoBuff = require ('./lib/image.json');
const board = new five.Board();
let boardSwitch = false;

board.on('ready', () => {
  console.log("relay connected, NC open");
  let initRelay = new five.Led(13);
  initRelay.on();
});

//getUserMediaのためのHTTPS化
const https = require('https');

//https鍵読み込み
const ssl_server_key = './server_key/server_key.pem',
    ssl_server_crt = './server_key/server_crt.pem',
    fs = require('fs');
const options = {
  key: fs.readFileSync(ssl_server_key),
  cert: fs.readFileSync(ssl_server_crt)
};
const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exportComponent = app;

let port = 8888;
let server = https.createServer(options,app).listen(port);
let io = require('socket.io').listen(server);

console.log("server start");

// 用途要確認
let startTime;
let toDay;
let thisYear;
let thisMonth;
let thisDate;
let scheduler;


const pcm2arr = (url) => {
  let tmpBuff = new Float32Array(8192);
  let rtnBuff = [];
  var i = 0;
  pcm.getPcmData(url, { stereo: true, sampleRate: 44100 },
    function(sample, channel) {
      tmpBuff[i] = sample;
      i++;
      if(i === 8192){
        rtnBuff.push(tmpBuff);
        //recordedBuff.push(tmpBuff);
        tmpBuff = new Float32Array(8192);
        i = 0;
      }
    },
    function(err, output) {
      if (err)
        throw new Error(err);
      //console.log(recordedBuff.length);
      console.log('wav loaded from ' + url);
    }
  );
  return rtnBuff;
}

//exports.sndImp = function wavImport(url, pcm, fname, bufferSize, io,trackNo) {
const audioBuff = {
  "DRUM": pcm2arr("./public/files/drum.wav"),
  "SILENCE": pcm2arr("./public/files/silence.wav")
}


const instructionArr = ["DO NOT MOVE", "BE QUIET", "GET OUT"];
const cmdList = ["FEEDBACK","WHITENOISE","SINEWAVE","RECORD","PLAYBACK","LOOKBACK","LOOPBACK","CHAT","VIDEOCHAT","CLICK","NOISE","FEED","PLAY","REC","DRUM","SILENCE","LOOK","LOOP","SAMPLERATE","FILTER","RATE","MOD","MODULATION","CHORD","STOP"];
const instructionDuration = [10000, 30000, 60000]
let strings = "";
let prevCmd = "";

// for dashbottun
/*
const PHY_ADDR = "34:d2:70:8d:c0:09"; //wilkinson
let button = new DashButton(PHY_ADDR);
let buttonFlag = false;

button.addListener(() => {
  let property = "";
  let chooseCmd = "";
  let buttonList = cmdList;
//  buttonList.unshift("SWITCH");
  if(buttonFlag){
    chooseCmd = "STOP";
    buttonFlag = false;
  } else {
    chooseCmd = buttonList[Math.floor(Math.random() * (buttonList.length-4))];
    if(chooseCmd === "SINEWAVE") {
      let param = Math.random();
      if(param > 0.66) {
        property = 20000;
      } else if(param > 0.33){
        property = 440;
      } else {
        property = 20;
      }
    }
    buttonFlag = true;
  }
  console.log("dash button Click, " + chooseCmd);
  if(chooseCmd === "SWITCH") {
    let relay = new five.Led(13);
    if(board.isReady){
      if(boardSwitch) {
        boardSwitch = false;
        relay.on();
        console.log("switch off")
        io.emit("cmdFromServer", {"cmd" : "SWITCH OFF"});
      } else {
        boardSwitch = true;
        relay.off();
        console.log("stitch on");
        io.emit("cmdFromServer", {"cmd" : "SWITCH ON"});
      }
    } else {
      console.log("arduino not ready");
      io.emit('instructionFromServer', {
        "text": "ARDUINO ERROR",
        "duration": 1500
      })
    }
  } else {
    io.emit("cmdFromServer", {"cmd" : chooseCmd, "property" : property});
  }
});
*/

// for instruction from server

// for pool audio visual chunk
let audiovisualChunk = [];
io.sockets.on('connection',(socket)=>{

  socket.on('infoReqFromClient',() =>{
    let connectedList = Object.keys(io["sockets"]["connected"]);
    let clientNumber = connectedList.indexOf(socket["id"]);
    console.log(connectedList);
    console.log(socket["id"] + " connected " + socket["handshake"]["headers"]["host"] + " as " + String(clientNumber));
    socket.emit('infoFromServer',{
      "address" : socket["handshake"]["headers"]["host"],
      "number" : clientNumber
    });
  });
  socket.on('chunkFromClient', (data)=>{
    audiovisualChunk.push({"audio": data["audio"], "video": data["video"]});
    console.log("chunk length: " + String(audiovisualChunk.length));
  });

  socket.on('charFromClient', (keyCode) => {
    let character = keycodeMap[String(keyCode)];
    //      strings = exportComponent.char2Cmd(io, strings, character, cmdList, keyCode);
    if(character === "enter") {
      if(cmdList.indexOf(strings) > -1) {
        console.log(cmdList.indexOf(strings));
        console.log("do cmd " + strings);
        io.emit("cmdFromServer", {"cmd" : strings});
      } else if (isNaN(Number(strings)) === false && strings != "") {
        console.log("sinewave " + strings + "Hz");
        io.emit("cmdFromServer", {
          "cmd" : "SINEWAVE",
          "property" : Number(strings)
        });
      } else if(strings === "SWITCH"){
        if(board.isReady){
          let relay = new five.Led(13);
          if(boardSwitch) {
            boardSwitch = false;
            relay.on();
            console.log("switch off")
            io.emit("cmdFromServer", {"cmd" : "SWITCH OFF"});
          } else {
            boardSwitch = true;
            relay.off();
            console.log("stitch on");
            io.emit("cmdFromServer", {"cmd" : "SWITCH ON"});
          }
        } else {
          console.log("arduino not ready");
          io.emit('instructionFromServer', {
            "text": "ARDUINO ERROR",
            "duration": 1500
          })
        }
//      });
      }
      prevCmd = strings;
      strings = "";
    } else if(character === "backspace" || character === "left_arrow" || character === "shift" || character === "ctrl" || character === "tab") { //left OR shift OR ctrl OR tab OR esc
      io.emit("stringsFromServer", "")
      strings =  "";
    } else if(character === "escape"){
      io.emit("cmdFromServer", {"cmd": "STOP"});
      strings =  "";
    } else if(keyCode >= 48 && keyCode <= 90 || keyCode === 190 || keyCode === 32){ //alphabet or number
      //add strings;
      strings =  strings + character;
      io.emit("stringsFromServer", strings);
      if(strings === "B") {
        strings = "";
      }
//
    } else if(character === "up_arrow"){
      strings = prevCmd;
      io.emit("stringsFromServer", strings);
    }
  });
  socket.on('wavReqFromClient',(data)=>{
    let idList = [];
    for (let key in io["sockets"]["connected"]) {
      idList.push(key);
    }
    console.log('emit' + data);
    console.log(idList);
//    let audioChoose = Math.floor(Math.random() * audioBuff.length);
//    console.log(audioChoose);
    io.to(idList[Math.floor(Math.random() * idList.length)]).emit('chatFromServer', {
      "audio": audioBuff[data][Math.floor(Math.random() * audioBuff[data].length)],
//      "audio": audioBuff[data][audioChoose],
      "video": videoBuff[data][Math.floor(Math.random() * videoBuff.length)],
      "target": data
    });
  })
  socket.on('reqChunkFromClient', (data)=>{
//    forin(io["sockets"]["connected"]){
//    }
    if(audiovisualChunk.length > 0) {
      let tmpBuff = audiovisualChunk.shift();
//      console.log(tmpBuff);
      if(data === "all"){
        tmpBuff["mode"] = "all";
        console.log('chunkEmit all');
        io.emit('chunkFromServer', tmpBuff);
      } else if(data ==="single"){
        tmpBuff["mode"] = "single";
        console.log('chunkEmit single');
        socket.emit('chunkFromServer', tmpBuff);
      } else if(data ==="loop_all"){
        tmpBuff["mode"] = "loop";
        io.emit('chunkFromServer', tmpBuff);
        audiovisualChunk.push(tmpBuff);
        console.log('chunkEmit loop all');
      } else if(data === "loop_single"){
        tmpBuff["mode"] = "loop";
        socket.emit('chunkFromServer', tmpBuff);
        console.log('chunkEmit loop single');
        audiovisualChunk.push(tmpBuff);
      }
    } else {
      io.emit("cmdFromServer", {"cmd": "STOP"});
    }
  });
  socket.on('chatFromClient', (data) => {
    let idList = [];
    for (let key in io["sockets"]["connected"]) {
      idList.push(key);
    }
    io.to(idList[Math.floor(Math.random() * idList.length)]).emit('chatFromServer',data);
  });
});

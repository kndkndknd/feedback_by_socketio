"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadStream = exports.pushStateStream = exports.pcm2arr = void 0;
const states_1 = require("./states");
const pcm = require("pcm");
const fs = require("fs");
const util = require("util");
const exec = require("child_process").exec;
var readDir = util.promisify(fs.readdir);
var readFile = util.promisify(fs.readFile);
var execPromise = util.promisify(exec);
const pcm2arr = (url) => {
    let tmpBuff = new Float32Array(states_1.basisBufferSize);
    let rtnBuff = [];
    var i = 0;
    pcm.getPcmData(url, { stereo: true, sampleRate: 44100 }, function (sample, channel) {
        tmpBuff[i] = sample;
        i++;
        if (i === states_1.basisBufferSize) {
            rtnBuff.push(tmpBuff);
            tmpBuff = new Float32Array(states_1.basisBufferSize);
            i = 0;
        }
    }, function (err, output) {
        if (err) {
            console.log("err");
            throw new Error(err);
        }
        console.log("pcm.getPcmData(" +
            url +
            "), {stereo: true, sampleRate: 44100}, (sample, channel)=>{function}");
    });
    return rtnBuff;
};
exports.pcm2arr = pcm2arr;
const pushStateStream = (streamName, states) => {
    states.current.stream[streamName] = false;
    states.previous.stream[streamName] = false;
    states.stream.sampleRate[streamName] = 44100;
    states.stream.glitch[streamName] = false;
    states.stream.grid[streamName] = false;
    states.stream.latency[streamName] = 1000;
    states.stream.random[streamName] = false;
    states.stream.randomrate[streamName] = false;
    states.stream.target[streamName] = [];
};
exports.pushStateStream = pushStateStream;
const uploadStream = async (stringArr, io) => {
    //  let ss = "00:00:00"
    //  let t = "00:00:20"
    switch (stringArr.length) {
        case 4:
            if (stringArr[3].includes(":")) {
                let timeArr = stringArr[3].split(":");
                if (timeArr.length === 3) {
                    states_1.uploadParams.t = stringArr[3];
                }
                else if (timeArr.length === 2) {
                    states_1.uploadParams.t = "00:" + stringArr[3];
                }
            }
        case 3:
            if (stringArr[2].includes(":")) {
                let timeArr = stringArr[2].split(":");
                if (timeArr.length === 3) {
                    states_1.uploadParams.ss = stringArr[2];
                }
                else if (timeArr.length === 2) {
                    states_1.uploadParams.ss = "00:" + stringArr[2];
                }
            }
            else if (stringArr[2] === "FULL") {
                states_1.uploadParams.t = "FULL";
                states_1.uploadParams.ss = "FULL";
            }
            break;
        case 2:
            break;
    }
    //fileImport(fname,libDir,statusImport,ss,t);
    try {
        const files = await readDir(states_1.uploadParams.mediaDir);
        // mediaDir内を順番にファイル名スキャン
        for (let i = 0; i <= files.length; i++) {
            let f = files[i];
            //ドット区切りがあり、ドット区切りの手前がstringArr[1]と同じ場合
            if (f != undefined && f.split(".")[0] === stringArr[1]) {
                console.log(f);
                const streamName = stringArr[1];
                let fSplit = f.split(".");
                if (!(streamName in states_1.streams)) {
                    states_1.streams[streamName] = {
                        audio: [],
                        video: [],
                        bufferSize: states_1.basisBufferSize,
                    };
                }
                let tmpBuff = new Float32Array(states_1.basisBufferSize);
                let rtnBuff = [];
                let i = 0;
                switch (fSplit[1].toLowerCase()) {
                    case "mov":
                    case "mp4":
                        let sndConvert = "";
                        let imgConvert = "";
                        sndConvert =
                            "ffmpeg -i " +
                                states_1.uploadParams.mediaDir +
                                f +
                                " -vn -acodec aac " +
                                states_1.uploadParams.mediaDir +
                                fSplit[0] +
                                ".aac";
                        imgConvert =
                            "ffmpeg -i " +
                                states_1.uploadParams.mediaDir +
                                f +
                                ' -r 5.4 -f image2 "' +
                                states_1.uploadParams.mediaDir +
                                fSplit[0] +
                                '%06d.jpg"';
                        if (states_1.uploadParams.ss !== "FULL" && states_1.uploadParams.t !== "FULL") {
                            sndConvert =
                                sndConvert +
                                    " -ss " +
                                    states_1.uploadParams.ss +
                                    " -t " +
                                    states_1.uploadParams.t;
                            imgConvert =
                                imgConvert +
                                    " -ss " +
                                    states_1.uploadParams.ss +
                                    " -t " +
                                    states_1.uploadParams.t;
                        }
                        await execPromise(sndConvert);
                        await execPromise(imgConvert);
                        // let j = 0
                        await pcm.getPcmData(states_1.uploadParams.mediaDir + streamName + ".aac", { stereo: true, sampleRate: 22050 }, function (sample, channel) {
                            tmpBuff[i] = sample;
                            i++;
                            if (i === states_1.basisBufferSize) {
                                // rtnBuff.push(tmpBuff);
                                //console.log(tmpBuff)
                                console.log("push audio buff");
                                states_1.streams[streamName].audio.push(tmpBuff);
                                /*
                                if(streams[streamName].length === 0) {
                                  streams[streamName].push({audio:tmpBuff, bufferSize: basisBufferSize})
                                  console.log(streams[streamName][streams[streamName].length-1].bufferSize)
                                } else {
                                  // if(streams[streamName].length >= j+1 && streams[streamName][j].video !== undefined) {
                                  if(streams[streamName].length >= j+1) {
                                    streams[streamName][j].audio = tmpBuff
                                    streams[streamName][j].bufferSize = basisBufferSize
                                  console.log(streams[streamName][j].bufferSize)
                                  }
                                  j++
                                }
                                */
                                tmpBuff = new Float32Array(states_1.basisBufferSize);
                                i = 0;
                            }
                        }, function (err, output) {
                            if (err) {
                                console.log("err");
                                throw new Error(err);
                            }
                            // streams[streamName].push({audio:rtnBuff})
                            console.log("pcm.getPcmData(" +
                                streamName +
                                ".aac, { stereo: true, sampleRate: 44100 })");
                            //                console.log(streams[streamName].audio.length);
                            execPromise("rm " + states_1.uploadParams.mediaDir + streamName + ".aac");
                        });
                        const files = await readDir(states_1.uploadParams.mediaDir);
                        let jpgs = [];
                        await files.forEach(async (file) => {
                            if (file.includes(fSplit[0]) && file.includes(".jpg")) {
                                await jpgs.push(file);
                            }
                        });
                        // console.log(jpgs)
                        // const jpgs = await readDir(uploadParams.mediaDir);
                        jpgs.forEach(async (element) => {
                            const img = await readFile(states_1.uploadParams.mediaDir + element);
                            const base64str = await new Buffer(img).toString("base64");
                            // console.log(base64str)
                            states_1.streams[streamName].video.push("data:image/jpeg;base64," + String(base64str));
                            await execPromise("rm " + states_1.uploadParams.mediaDir + element);
                            io.emit("stringsFromServer", {
                                strings: "UPLOADED",
                                timeout: true,
                            });
                        });
                        /*
                        if(streams[streamName].length === 0) {
                          jpgs.forEach(async (element) => {
                            const img = await readFile(uploadParams.mediaDir + element)
                            const base64str = await new Buffer(img).toString('base64')
                            // console.log(base64str)
                            streams[streamName].push('data:image/jpeg;base64,' + String(base64str))
                            await execPromise('rm ' + uploadParams.mediaDir + element)
                            io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
                            
                          })
                        } else {
                          await streams[streamName].forEach(async (element, index) => {
              //              if(jpgs[j] != undefined && jpgs[j].includes(fSplit[0]) && jpgs[j].includes(".jpg")){
                            console.log(process.env.HOME + uploadParams.mediaDir + jpgs[index])
                            const img = await readFile(uploadParams.mediaDir + jpgs[index])
                            const base64str = await new Buffer(img).toString('base64')
                            // console.log(base64str)
                            element.video = 'data:image/jpeg;base64,' + String(base64str)
                            await execPromise('rm ' + uploadParams.mediaDir + jpgs[index])
                            io.emit('stringsFromServer',{strings: "UPLOADED", timeout: true})
                          });
                          
                        }
                        */
                        console.log("video file");
                        //コマンド、パラメータにUPLOAD対象を追加
                        states_1.streamList.push(streamName);
                        (0, exports.pushStateStream)(streamName, states_1.states);
                        break;
                    case "aac":
                    case "m4a":
                    case "mp3":
                    case "wav":
                    case "aif":
                    case "aiff":
                        await pcm.getPcmData(states_1.uploadParams.mediaDir + f, { stereo: true, sampleRate: 22050 }, function (sample, channel) {
                            tmpBuff[i] = sample;
                            i++;
                            if (i === states_1.basisBufferSize) {
                                states_1.streams[streamName].audio.push(tmpBuff);
                                tmpBuff = new Float32Array(states_1.basisBufferSize);
                                i = 0;
                            }
                        }, function (err, output) {
                            if (err) {
                                console.log("err");
                                throw new Error(err);
                            }
                            console.log("pcm.getPcmData(" +
                                f +
                                ", { stereo: true, sampleRate: 44100 })");
                            io.emit("stringsFromServer", {
                                strings: "UPLOADED",
                                timeout: true,
                            });
                        });
                        states_1.streamList.push(streamName);
                        (0, exports.pushStateStream)(streamName, states_1.states);
                        break;
                    default:
                        console.log("not media file");
                        io.emit("stringsFromServer", {
                            strings: "NO MEDIA FILE",
                            timeout: true,
                        });
                }
            }
        }
        console.log(files);
    }
    catch (e) {
        console.error(e);
    }
};
exports.uploadStream = uploadStream;
//# sourceMappingURL=upload.js.map
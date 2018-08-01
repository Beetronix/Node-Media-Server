//
//  Created by Mingliang Chen on 18/3/16.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./node_core_logger');

const EventEmitter = require('events');
const { spawn } = require('child_process');
const dateFormat = require('dateformat');
const mkdirp = require('mkdirp');
const fs = require('fs');

const RTSP_TRANSPORT = ['udp', 'tcp', 'udp_multicast', 'http'];

class NodeRelaySession extends EventEmitter {
  constructor(conf) {
    super();
    this.conf = conf;
  }

  run () {

    let inArgv = ['-fflags', 'nobuffer', '-analyzeduration', '1000000', '-i', this.conf.inPath];
    let outArgv = ['-f', 'flv', this.conf.ouPath];

    let videoArgv = ['-c:v', 'copy'];
    let audioArgv = ['-c:a', 'copy'];

    if (this.conf.audio !== null) {
      if (typeof this.conf.audio == 'boolean' && this.conf.audio === false) {
        audioArgv = ['-an'];
      } else if (typeof this.conf.audio == 'string') {
        audioArgv = ['-c:a', this.conf.audio];
      }
    }

    let argv = inArgv.concat(videoArgv, audioArgv, outArgv);

    if (this.conf.inPath[0] === '/' || this.conf.inPath[1] === ':') {
      argv.unshift('-1');
      argv.unshift('-stream_loop');
      argv.unshift('-re');
    }

    if (this.conf.inPath.startsWith('rtsp://') && this.conf.rtsp_transport) {
      if (RTSP_TRANSPORT.indexOf(this.conf.rtsp_transport) > -1) {
        argv.unshift(this.conf.rtsp_transport);
        argv.unshift('-rtsp_transport');
      }
    }



    // start ffmpeg with the specified arguments
    Logger.ffdebug(argv.toString());
    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);
    this.ffmpeg_exec.on('error', (e) => {
      Logger.ffdebug(e);
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      Logger.ffdebug(`FF输出：${data}`);
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      Logger.ffdebug(`FF输出：${data}`);
    });

    this.ffmpeg_exec.on('close', (code) => {
      Logger.log('[Relay end] id=', this.id);
      this.emit('end', this.id);
    });
  }

  end () {
    this.ffmpeg_exec.kill('SIGKILL');
  }
}

module.exports = NodeRelaySession;
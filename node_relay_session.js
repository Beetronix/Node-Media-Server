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
    let outArgv = [];
    if (this.conf.multi_qualities && this.conf.multi_qualities === true) {
      outArgv = outArgv.concat(
        ['-f', 'flv', '-map', '0:0', this.conf.ouPath], // original quality (1080x960)
        ['-f', 'flv', '-map', '0:0', '-vf', "scale=iw/1.5:ih/1.5", this.conf.ouPath + '_hd'], // high definition (720x640)
        ['-f', 'flv', '-map', '0:0', '-vf', "scale=iw/2:ih/2", this.conf.ouPath + '_md'], // medium definition (540x480)
        ['-f', 'flv', '-map', '0:0', '-vf', "scale=iw/3:ih/3", this.conf.ouPath + '_ld'], // low definition (360x320)
        ['-f', 'flv', '-map', '0:0', '-vf', "scale=iw/4:ih/4", this.conf.ouPath + '_vld'], // very low definition (270x240)
      )
    } else
      outArgv = ['-f', 'flv', this.conf.ouPath];

    let videoArgv = ['-c:v', 'h264'];
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
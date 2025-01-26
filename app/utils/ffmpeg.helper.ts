export class FFmpegHelper {
  private static instance: FFmpegHelper | null = null;
  private ffmpegCore: any = null;
  private ffmpegRunning: boolean = false;
  private ffmpegCurrentDuration: number | null = null;
  private runResolve: ((value: unknown) => void) | null = null;
  
  ffmpegDurationHandler?: (duration: number) => void;
  ffmpegProgressHandler?: (progress: number) => void;
  ffmpegLogHandler?: (type: string, message: string) => void;

  private static worker: Worker | null = null;

  private constructor() {}

  public static async getInstance(): Promise<FFmpegHelper> {
    // TODO: use the same instance everytime. I wish i could get this working.
    // example code does this as well Lmfao https://0110.be/attachment/cors/ffmpeg.audio.wasm/transcode.html
    this.instance = new FFmpegHelper();
    await this.instance.initialzeFFmpeg();
    return this.instance;
  }

  private handleFFmpegOutput = (type: string, message: string) => {
    if (this.ffmpegLogHandler) this.ffmpegLogHandler(type, message);
    
    this.detectDuration(message);
    this.detectProgress(message);
    this.detectCompletion(message);
  }

  async initialzeFFmpeg() {
    try {
      if (typeof window === 'undefined') return;

      if (this.ffmpegCore) {
        try {
          this.ffmpegCore.exit();
          this.ffmpegCore = null;
        } catch (e) {
          console.warn('Error cleaning up FFmpeg instance:', e);
        }
      }

      if (FFmpegHelper.worker) {
        FFmpegHelper.worker.terminate();
        FFmpegHelper.worker = null;
      }

      // @ts-ignore
      const { createFFmpegCore } = window;
      
      if (!createFFmpegCore) {
        throw new Error('FFmpeg core not loaded');
      }

      await createFFmpegCore({
        print: (text: string) => { this.handleFFmpegOutput("stdout", text); },
        printErr: (text: string) => { this.handleFFmpegOutput("stderr", text); },
        locateFile: (path: string) => {
          if (path.endsWith('.worker.js')) {
            return '/ffmpeg/ffmpeg.core.worker.js';
          }
          if (path.endsWith('.wasm')) {
            return '/ffmpeg/ffmpeg.core.wasm';
          }
          return path;
        }
      }).then((Module: any) => {
        this.ffmpegCore = Module;
        console.log('FFmpeg WASM module loaded successfully');
      });

    } catch (error) {
      console.error('Error initializing FFmpeg:', error);
      throw error;
    }
  }

  private detectProgress(message: string) {
    const progress_matches = message.match(/.*time.(\d\d).(\d\d).(\d\d).(\d+).*/m);
    if (!progress_matches) return;

    const hours = parseFloat(progress_matches[1]);
    const minutes = parseFloat(progress_matches[2]);
    const seconds = parseFloat(progress_matches[3]);
    const milliseconds = parseFloat("0." + progress_matches[4]) * 1000.0;
    const progress_in_seconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000.0;

    let ratio = progress_in_seconds;
    if (this.ffmpegCurrentDuration != null) {
      ratio = Math.floor(progress_in_seconds / this.ffmpegCurrentDuration * 100.0);
    }

    if (this.ffmpegProgressHandler) {
      this.ffmpegProgressHandler(ratio);
    }

    return progress_in_seconds;
  }

  private detectDuration(message: string) {
    const duration_matches = message.match(/.*Duration..(\d\d).(\d\d).(\d\d).(\d+).*/m);
    if (!duration_matches) return;

    const hours = parseFloat(duration_matches[1]);
    const minutes = parseFloat(duration_matches[2]);
    const seconds = parseFloat(duration_matches[3]);
    const milliseconds = parseFloat("0." + duration_matches[4]) * 1000.0;
    const duration_in_seconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000.0;

    if (this.ffmpegDurationHandler) {
      this.ffmpegDurationHandler(duration_in_seconds);
    }

    this.ffmpegCurrentDuration = duration_in_seconds;
    return duration_in_seconds;
  }

  private detectCompletion(message: string) {
    if ((message.includes('kB muxing overhead') || 
         message.includes('Invalid argument') || 
         message.includes('Invalid data found') || 
         message.includes("At least one output file")) && 
        this.runResolve !== null) {
      this.runResolve(true);
      this.runResolve = null;
      this.ffmpegRunning = false;
      this.ffmpegCurrentDuration = null;
      if (this.ffmpegProgressHandler) {
        this.ffmpegProgressHandler(100);
      }
    }
  }

  FS() {
    if (!this.ffmpegCore) {
      throw new Error('FFmpeg not initialized');
    }
    return this.ffmpegCore.FS;
  }

  async run(args: string[]) {
    const defaultArgs = ['-y', '-hide_banner', '-stats_period', '0.2', '-loglevel', 'info', '-nostdin'];
    const fullArgs = [...defaultArgs, ...args];
    
    console.log('info', `run ffmpeg command: ${fullArgs.join(' ')}`);
    
    if (this.ffmpegRunning) {
      throw Error('ffmpeg.wasm can only run one command at a time');
    }
    
    this.ffmpegRunning = true;
    try {
      const result = await new Promise((resolve) => {
        this.runResolve = resolve;
        this.ffmpegCore.callMain(fullArgs);
      });
      return result;
    } finally {
      this.ffmpegRunning = false;
      if (this.ffmpegCore) {
        try {
          this.ffmpegCore.exit();
          this.ffmpegCore = null;
        } catch (e) {
          console.warn('Error cleaning up FFmpeg instance:', e);
        }
      }
    }
  }

  async writeFile(path: string, data: Uint8Array) {
    try {
      const fs = this.FS();
      const dirs = path.split('/').slice(0, -1);
      let currentPath = '';
      for (const dir of dirs) {
        if (dir) {
          currentPath += '/' + dir;
          try {
            fs.mkdir(currentPath);
          } catch (e) {
          }
        }
      }
      fs.writeFile(path, data);
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  async readFile(path: string): Promise<Uint8Array> {
    try {
      return this.FS().readFile(path);
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async deleteFile(path: string) {
    try {
      this.FS().unlink(path);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
}

export async function getFFmpegHelper(): Promise<FFmpegHelper> {
  return FFmpegHelper.getInstance();
} 
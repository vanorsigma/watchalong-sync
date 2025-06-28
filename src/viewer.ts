import jsQR from 'jsqr';
import { readSyncShareInfo, VideoStateCommand } from './sharing';
import { TwitchChatClient } from './chat';

const baseUrl: HTMLInputElement = document.getElementById('baseUrl') as HTMLInputElement;
const channelName: HTMLInputElement = document.getElementById('channelName') as HTMLInputElement;
const updateFile: HTMLButtonElement = document.getElementById('updateFile') as HTMLButtonElement;
const twitchstatus: HTMLSpanElement = document.getElementById('twitchStatus') as HTMLSpanElement;
const syncstatus: HTMLParagraphElement = document.getElementById('syncStatus') as HTMLParagraphElement;
const windowsync: HTMLButtonElement = document.getElementById('windowsync') as HTMLButtonElement;
const camerasync: HTMLButtonElement = document.getElementById('camerasync') as HTMLButtonElement;
const canvas: HTMLCanvasElement = document.getElementById('captureOutput') as HTMLCanvasElement;
const video: HTMLVideoElement = document.getElementById('watchalong-video') as HTMLVideoElement;
const track: HTMLTrackElement = document.getElementById('watchalong-track') as HTMLTrackElement;

enum State {
  UNKNOWN = -1,
  WAITING_FOR_INITIAL = 0,
  WAITING_FOR_CHANGE = 1,
};

let base = '';
let scanning = false;
let captureState: State = State.UNKNOWN;
let currentOffset: number = 0;

let client: TwitchChatClient | undefined = undefined;

function updateVideo(path: string, seek_position: number, state: VideoStateCommand) {
  if (video.src !== `${base}/${path}`) {
    video.src = `${base}/${path}`;
  }
  video.fastSeek(seek_position);
  if (state === 'play') {
    video.play();
  } else {
    video.pause();
  }

  track.src = `${base}/${[...path.split('.').slice(0, -1), 'vtt'].join('.')}`
}

async function startCaptureAndScan(stream: MediaStream) {
  windowsync.disabled = true;
  camerasync.disabled = true;
  canvas.hidden = false;
  syncstatus.innerText = 'Awaiting capture input';

  const captureVideo = document.createElement('video');
  captureVideo.style.display = 'none';
  document.body.appendChild(captureVideo);
  captureVideo.srcObject = stream;
  captureVideo.play();
  scanning = true;

  let qrResult: string = '';

  function scanLoop() {
    if (!scanning) return;
    if (captureVideo.readyState === captureVideo.HAVE_ENOUGH_DATA) {
      canvas.width = captureVideo.videoWidth;
      canvas.height = captureVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      ctx.drawImage(captureVideo, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const qr = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: "dontInvert" });
      if (qr) {
        switch (captureState) {
          case State.UNKNOWN:
            captureState = State.WAITING_FOR_INITIAL;
            break;
          case State.WAITING_FOR_INITIAL:
            syncstatus.innerText = 'Detected, please wait...';
            const syncshareinfoInitial = readSyncShareInfo(qr.data);
            if (!syncshareinfoInitial) {
              syncstatus.innerText = 'Not a valid syncshareinfo';
              break;
            }

            qrResult = qr.data;
            syncstatus.innerText = 'First calibration QR detected, waiting for QR to update...';
            captureState = State.WAITING_FOR_CHANGE;
            break;
          case State.WAITING_FOR_CHANGE:
            if (qr.data !== qrResult) {
              const syncshareinfo = readSyncShareInfo(qr.data);
              if (!syncshareinfo) {
                return;
              }

              const currentTimeMillis = new Date().getTime();
              currentOffset = currentTimeMillis - Number(syncshareinfo.syncstr).valueOf();

              syncstatus.innerText = `Second calibration QR detected, stream delay is ${currentOffset}ms`;
              updateVideo(syncshareinfo.path, syncshareinfo.seekposition, syncshareinfo.state);

              scanning = false;
              stream.getTracks().forEach(track => track.stop());
              document.body.removeChild(captureVideo);
              windowsync.disabled = false;
              camerasync.disabled = false;

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              canvas.hidden = true;

              captureState = State.UNKNOWN;
            }
            break;
        }
      }
    }
    requestAnimationFrame(scanLoop);
  }
  scanLoop();
}

windowsync.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    alert('Screen Capture API not supported in this browser.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    startCaptureAndScan(stream);
  } catch (err) {
    syncstatus.innerText = "Screen capture cancelled or failed: " + err;
    windowsync.disabled = false;
    camerasync.disabled = false;
  }
});

camerasync.addEventListener('click', async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera API not supported in this browser.');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    startCaptureAndScan(stream);
  } catch (err) {
    syncstatus.innerText = "Camera capture cancelled or failed: " + err;
    windowsync.disabled = false;
    camerasync.disabled = false;
  }
});

updateFile.addEventListener('click', (() => {
  base = baseUrl.value;
  client = new TwitchChatClient(channelName.value);
  client.addCallback('connect', () => {
    twitchstatus.innerText = 'Connected';
  });

  client.addCallback('disconnect', () => {
    twitchstatus.innerText = 'Disconnected';
  });

  client.setCommandHandler((message) => {
    const syncshareinfo = readSyncShareInfo(message);
    if (syncshareinfo) {
      // use the delay we got from calibration
      setTimeout(() => {
        updateVideo(syncshareinfo.path, syncshareinfo.seekposition, syncshareinfo.state);
      }, currentOffset);
    }
  });
}));

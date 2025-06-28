import { makeTwitchChatStreamerClient, TwitchChatClient } from './chat';
import QRCode from 'qrcode';
import { TWITCH_CLIENT_ID } from './consts';
import { getCookie } from './cookies';
import { writeSyncShareInfo } from './sharing';

const baseUrl: HTMLInputElement = document.getElementById('baseUrl') as HTMLInputElement;
const filePath: HTMLInputElement = document.getElementById('filePath') as HTMLInputElement;
const loginStatus: HTMLSpanElement = document.getElementById('loginStatus') as HTMLSpanElement;
const loginTwitch: HTMLButtonElement = document.getElementById('loginTwitch') as HTMLButtonElement;
const updateFile: HTMLButtonElement = document.getElementById('updateFile') as HTMLButtonElement;
const qrcodeOutput: HTMLImageElement = document.getElementById('qrcodeOutput') as HTMLImageElement;
const video: HTMLVideoElement = document.getElementById('watchalong-video') as HTMLVideoElement;
const track: HTMLTrackElement = document.getElementById('watchalong-track') as HTMLTrackElement;

const twitchToken = getCookie('twitchToken') ?? '';

function makeOutput() {
  const currentTimeMillis = new Date().getTime();
  const videoState = video.paused ? 'pause' : 'play';

  return writeSyncShareInfo({
    path: filePath.value,
    seekposition: video.currentTime,
    state: videoState,
    syncstr: currentTimeMillis.toString(),
  });
}

setInterval(async () => {
  qrcodeOutput.src = await QRCode.toDataURL(makeOutput());
}, 1000);

let client: TwitchChatClient | undefined;

(async () => {
  try {
    client = await makeTwitchChatStreamerClient(twitchToken);
  } catch {
    loginStatus.innerText = 'Client error. Try logging in.';
  }

  if (client) {
    client.addCallback('connect', () => {
      loginStatus.innerText = 'Connected';
    });

    client.addCallback('disconnect', () => {
      loginStatus.innerText = 'Disconnected';
    });

    client.addCallback('auth_failure', () => {
      loginStatus.innerText = 'Authentication failed. Try logging in again.';
    });
  }
})();

loginTwitch.onclick = () => {
  const redirectUri = (window.location.origin + window.location.pathname).replace('streamer.html', 'login.html');
  window.location.replace(`https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=chat%3Aread%20chat%3Aedit`);
}

updateFile.onclick = () => {
  video.src = `${baseUrl.value}/${filePath.value}`
  track.src = `${baseUrl.value}/${[...filePath.value.split('.').slice(0, -1), 'vtt'].join('.')}`
  client?.sendMessage(makeOutput());
}

video.addEventListener('play', () => {
  client?.sendMessage(makeOutput());
});

video.addEventListener('pause', () => {
  client?.sendMessage(makeOutput());
});

video.addEventListener('seeked', () => {
  client?.sendMessage(makeOutput());
});

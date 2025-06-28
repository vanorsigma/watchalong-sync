import { setCookie } from "./cookies";

const params = new URLSearchParams(window.location.hash.substring(1));

const accessToken = params.get('access_token');

if (accessToken) {
  console.log('Twitch Access Token Found:', accessToken);
  setCookie('twitchToken', accessToken);

  const redirectUri = (window.location.origin + window.location.pathname).replace('login.html', '');
  window.location.replace(redirectUri);
} else {
  console.log('No access_token found in URL fragment.');
  window.alert('Authentication failed');
}

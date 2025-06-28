export function getCookie(key: string): string | null {
  const cookies = document.cookie;
  const cookieArray = cookies.split(';');

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.startsWith(`${key}=`)) {
      return cookie.substring(key.length + 1);
    }
  }
  return null;
}

export function setCookie(key: string, value: string, days?: number): void {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${key}=${value}${expires}; path=/`;
}

export function removeCookie(key: string): void {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export type VideoStateCommand = 'play' | 'pause' | 'seek';

export interface SyncShareInfo {
  syncstr: string;
  path: string;
  seekposition: number;
  state: VideoStateCommand;
}

export function writeSyncShareInfo(shareInfo: SyncShareInfo) {
  return `${shareInfo.syncstr}|${shareInfo.path.replace('|', '\\-')}|${shareInfo.seekposition}|${shareInfo.state}`
}

export function readSyncShareInfo(inputstr: string): SyncShareInfo | null {
  const arrInfo = inputstr.split('|').map(t => t.replace('\\-', '|'));
  if (arrInfo.length !== 4) {
    return null;
  }

  return {
    syncstr: arrInfo[0],
    path: arrInfo[1],
    seekposition: new Number(arrInfo[2]).valueOf(),
    state: arrInfo[3] as VideoStateCommand,
  }
}

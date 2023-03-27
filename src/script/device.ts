export namespace Device {
  export const MediaKind = {
    videoinput: 'videoinput',
    audioinput: 'audioinput',
    audiooutput: 'audiooutput',
  } as const;
  export type MediaKind = typeof MediaKind[keyof typeof MediaKind];

  export interface DeviceListRow {
    deviceId: string;
    groupId: string;
    kind: MediaKind;
    label: string;
  }

  export const GetMediaList = async (mediaKind: MediaKind | undefined = undefined) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('enumerateDevices() not supported.');
    }
    const ret: DeviceListRow[] = [];
    await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'environment',
      },
    });
    const list = await navigator.mediaDevices.enumerateDevices();
    list.forEach((row) => {
      if (mediaKind !== undefined && row.kind !== mediaKind) {
        return;
      }
      ret.push({
        deviceId: row.deviceId,
        groupId: row.groupId,
        kind: row.kind,
        label: row.label,
      });
    });
    return ret;
  };

  /**
   * カメラの起動
   */
  export const GetVideoStream = async (
    deviceId: string | undefined = undefined
  ): Promise<{ stream: MediaStream | null; message: string }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: deviceId,
          advanced: [
            //
            { facingMode: 'environment' },
            { aspectRatio: 1 },
            {
              width: { min: 1080, ideal: 1080, max: 1080 },
              height: { min: 1080, ideal: 1080, max: 1080 },
            },
            // {
            //   width: { min: 640, ideal: 1080, max: 1920 },
            //   height: { min: 640, ideal: 1080, max: 1920 },
            // },
          ],
        },
      });
      return { stream: stream, message: '' };
    } catch (error: any) {
      if (error instanceof Error) {
        if (error.message == 'Permission denied') {
          return {
            stream: null,
            message: 'カメラの使用権限を再設定してください。\n※設定後ブラウザのリフレッシュをお願いします。',
          };
        } else if (
          error.name == 'TypeError' &&
          error.message == "undefined is not an object (evaluating 'navigator.mediaDevices.getUserMedia')"
        ) {
          return { stream: null, message: 'ご利用のデバイスとブラウザの組み合わせではご利用になれません' };
        } else {
          return {
            stream: null,
            message: error.name + ': ' + error.message,
          };
        }
      }
      return { stream: null, message: String(error) };
    }
  };

  /**
   * カメラの停止
   */
  export const StopVideoStream = (stream: MediaStream | null): null => {
    try {
      if (stream) {
        for (let i = 0; i < stream.getTracks().length; i++) {
          stream.getTracks()[i].stop();
        }
      }
    } catch (e) {
      console.error('StopStream', e);
    }
    return null;
  };

  /**
   * ストリームを開始したビデオのサイズを取得する
   */
  export const GetVideoSize = (videoElement: HTMLVideoElement) => {
    return new Promise<{ w: number; h: number } | null>((resolve) => {
      // console.log('IncDevice.GetVideoSize');
      const ret = { w: 0, h: 0 };
      const intervalId = setInterval(() => {
        if (!(videoElement.readyState >= HTMLMediaElement.HAVE_METADATA)) return;
        ret.h = videoElement.videoHeight;
        ret.w = videoElement.videoWidth;
        clearInterval(intervalId);
        resolve(ret);
        return;
      }, 200);
      setTimeout(() => {
        clearInterval(intervalId);
        resolve(null);
      }, 2000);
    });
  };
}

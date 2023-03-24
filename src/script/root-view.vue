<script setup lang="ts">
import { onMounted, ref, watch, reactive, computed } from 'vue';

import { useElementSize } from '@vueuse/core';
import { Device } from './device';
const elmTop = ref<HTMLElement | null>(null);
const elmBottom = ref<HTMLElement | null>(null);
interface State {
  video: {
    // selectedDeviceId: null | string;
    stream: MediaStream | null;
    size: {
      h: number;
      w: number;
    };
    zoom: number;
  };
  device: {
    id: null | string;
    list: Device.DeviceListRow[];
  };
  scan: {
    intervalId: null;
    isDecoding: boolean;
    fps: number;
    data: string | null;
    adjuster: number;
    rect: {
      x: number;
      y: number;
      h: number;
      w: number;
    };
  };
}

const state = reactive<State>({
  video: {
    // selectedDeviceId: null,
    stream: null,
    size: {
      h: 0,
      w: 0,
    },
    zoom: 1,
  },
  device: {
    id: null,
    list: [],
  },
  scan: {
    intervalId: null,
    isDecoding: false,
    data: null,
    fps: 10,
    adjuster: 1,
    rect: {
      x: 0,
      y: 0,
      h: 0,
      w: 0,
    },
  },
});
const elmVideo = ref<HTMLVideoElement | null>(null);
const elmCanvas = ref<HTMLCanvasElement | null>(null);
const elmViewContainer = ref(null);
const elmViewContainerSize = useElementSize(elmViewContainer);
// const stream = ref<MediaStream | null>(null);

//---------------------------------------------
/**
 * カメラ一覧取得
 */
const getDeviceList = async () => {
  state.device.list = await Device.GetMediaList(Device.MediaKind.videoinput);
};

watch(
  () => state.device.list,
  (list) => {
    //カメラが一つだけだったらそれでいいじゃん
    if (list.length === 1) state.device.id = list[0].deviceId;
  }
);

watch(
  () => state.device.id,
  async (value) => {
    if (!value) return;
    console.log('ID　変更' + value);
    resetCamera();
  }
);

//-[stream]----------------------------------------------

/**
 * カメラ機能リセット
 */
const resetCamera = async () => {
  try {
    if (state.device.id === null) return;
    await startStream(state.device.id);
    drawOverlay();
    // startQrReader();
  } catch (error) {
    console.error('resetCamera', error);
  }
};

//-[stream]----------------------------------------------
const startStream = async (deviceId: string) => {
  try {
    stopStream();
    if (elmVideo.value === null) throw new Error('ビデオタグがありません？');
    const ret = await Device.GetVideoStream(deviceId);
    if (ret.stream === null) throw new Error(ret.message);
    state.video.stream = ret.stream;
    const size = await Device.GetVideoSize(elmVideo.value);
    if (size === null) throw new Error('ビデオの解像度が何故か取れませんでした？');
    state.video.size = size;
  } catch (error: any) {
    console.error('GetVideoStream : Error : ' + error.message);
  }
};

/**
 * ビデオの解像度から親要素に収まる拡大率を計算する
 */
const zoomRate = computed(() => {
  const width = elmViewContainerSize.width.value;
  const rateX = width / state.video.size.w;
  const rateY = width / state.video.size.h;
  if (rateX > 1 || rateY > 1) {
    return 1;
  } else {
    return Math.max(rateX, rateY);
  }
});

/**
 * カメラ Stream停止
 */
const stopStream = () => {
  if (state.video.stream === null) {
    state.video.stream = Device.StopVideoStream(state.video.stream);
  }
};

// [ キャンバス描画 ] -------------------------------------------------------------

/**
 * ガイド線の描画
 */
const drawOverlay = () => {
  console.log('drawOverlay');
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    if (!elmCanvas.value) return;
    ctx = elmCanvas.value.getContext('2d');
    if (!ctx) throw new Error(`state.element.canvasOverlay.getContext('2d') Error`);
    ctx.clearRect(0, 0, state.video.size.w, state.video.size.h);
    const color = state.scan.data !== null ? 'rgb(255,120,0)' : 'rgb(0,140,0)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    const w = Math.min(state.video.size.w, state.video.size.h);
    const lineW = (w * state.scan.adjuster) / 2;
    state.scan.rect.x = state.video.size.w / 2 - lineW / 2;
    state.scan.rect.y = state.video.size.h / 2 - lineW / 2;
    state.scan.rect.w = lineW;
    state.scan.rect.h = lineW;
    ctx.strokeRect(state.scan.rect.x, state.scan.rect.y, state.scan.rect.w, state.scan.rect.h);
  } catch (error) {
    console.error('drawOverlay', error);
  } finally {
    ctx = null;
  }
};

watch(
  () => [state.scan.adjuster, state.scan.data],
  () => {
    // console.log('watch', ' [state.read.adjuster, state.read.scanData.succsess]', before, after);
    drawOverlay();
  }
);

// [ QR解析関連 ] -------------------------------------------------------------

/**
 * qr解析タスクの開始
 */
const startQrReader = () => {
  stopQrReader();
  //console.log('startQrReader');
  const fps = 5;
  const stayTime = 3;
  state.scan.intervalId = (setInterval as any)(async () => {
    try {
      if (state.scan.data !== null) return;
      if (state.scan.isDecoding === true) {
        console.log('QrReader >> isDecoding');
        return;
      }
      state.scan.isDecoding = true;
      await qrRead();
    } catch (error) {
      console.error('QrReader >> isDecoding', error);
    } finally {
      state.scan.isDecoding = false;
    }
  }, Math.floor(1000 / state.scan.fps));
};

/**
 * QRコードを解析します。
 */
const qrRead = async () => {
  //  console.log('read', rect);
  if (!elmVideo.value) return;
  let canv: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const rect = state.scan.rect;
    canv = document.createElement('canvas');
    if (!canv) return;
    canv.height = rect.h;
    canv.width = rect.w;
    ctx = canv.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(elmVideo.value, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.w);
    const dataUrl = canv.toDataURL('image/jpg');
    // const ret = await IncQr.DecodeFromImageUrl(dataUrl);
    // if (ret != null) {
    //   state.read.scanData.succsess = true;
    //   state.read.scanData.text = ret;
    // } else {
    //   state.read.scanData.succsess = false;
    //   state.read.scanData.text = '';
    // }
  } catch (error) {
    console.error('qrRead', error);
  } finally {
    ctx = null;
    if (canv) {
      canv.height = 0;
      canv.width = 0;
      canv.remove();
    }
    canv = null;
  }
};

/**
 * qr解析タスクの終了
 */
const stopQrReader = () => {
  // // console.log('stopQrReader');
  // if (state.read.taskId != null) {
  //   clearInterval(state.read.taskId);
  //   state.read.taskisRun = false;
  // }
};

//-[Style]----------------------------------------------
const stypeViewContainer = computed(() => {
  return {
    height: elmViewContainerSize.width.value + 'px',
  };
});

const stypeViewZoom = computed(() => {
  return {
    transform: `scale(${zoomRate.value})`,
    opacity: state.video.stream?.active === false ? '0' : '1',
  };
});

const stypeViewRect = computed(() => {
  if (state.video.size.h === 0) {
    return {
      opacity: 0,
    };
  }
  return {
    height: state.video.size.h + 'px',
    width: state.video.size.w + 'px',
  };
});

const test = () => {
  console.log('stream', state.video.stream);
};

onMounted(() => {
  getDeviceList();
});
</script>
<template>
  <div class="container-fluid">
    <div class="card mt-2 mb-3" ref="elmTop">
      <div class="card-header bg-info">カメラ</div>
      <div class="card-body">
        <div class="">デバイスリスト</div>
        <select class="form-select" aria-label="Default select example" v-model="state.device.id">
          <template v-for="(row, index) in state.device.list" :key="index">
            <option :value="row.deviceId">{{ row.label }}</option>
          </template>
        </select>

        <div class="">{{ zoomRate }}</div>
        <div class="">{{ elmViewContainerSize }}</div>
        <div class="">{{ state.video.size }}</div>
        <div class="view-container" ref="elmViewContainer" :style="stypeViewContainer">
          <div class="view-zoom" :style="stypeViewZoom">
            <div class="view-rect" :style="stypeViewRect">
              <video
                class="video-origin"
                ref="elmVideo"
                autoplay="true"
                muted="true"
                playsinline="true"
                :srcObject="state.video.stream"
              ></video>
              <canvas
                class="canvas-overlay"
                ref="elmCanvas"
                :height="state.video.size.h"
                :width="state.video.size.w"
              ></canvas>
            </div>
          </div>
        </div>

        <div class="" @click="test">test</div>

        <div class="">{{ state.scan.rect }}</div>
        <div class="">{{ state.device.list }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card,
.card-header,
.card-body {
  border-color: rgb(24, 7, 112);
}

.message {
  white-space: pre;
}
.d-flex {
  justify-content: center;
}
.view-container {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;

  .view-zoom {
    transform-origin: top center;
    opacity: 0;
    canvas,
    video {
      position: absolute;
      inset: 0 0 0 0;
    }

    canvas {
      // background-color: rgba(191, 46, 46, 0.241);
    }
  }
}
</style>

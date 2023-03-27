<script setup lang="ts">
import { onMounted, ref, watch, reactive, computed } from 'vue';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useElementSize } from '@vueuse/core';
import { Device } from './device';

interface State {
  video: {
    stream: MediaStream | null;
    size: {
      h: number;
      w: number;
    };
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
    stream: null,
    size: {
      h: 0,
      w: 0,
    },
  },
  device: {
    id: null,
    list: [],
  },
  scan: {
    intervalId: null,
    isDecoding: false,
    data: null,
    fps: 1,
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

/**
 * カメラ機能リセット
 */
const resetCamera = async () => {
  try {
    if (state.device.id === null) return;
    await startStream(state.device.id);
    drawOverlay();
    startQrReader();
  } catch (error) {
    console.error('resetCamera', error);
  }
};

//-[stream]----------------------------------------------
const startStream = async (deviceId: string) => {
  try {
    if (elmVideo.value === null) throw new Error('ビデオタグがありません？');
    //既存Streamがある場合、停止させる
    if (state.video.stream === null) {
      state.video.stream = Device.StopVideoStream(state.video.stream);
    }
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
const scale = computed(() => {
  const width = elmViewContainerSize.width.value;
  const rateX = width / state.video.size.w;
  const rateY = width / state.video.size.h;
  if (rateX > 1 || rateY > 1) {
    return 1;
  } else {
    return Math.max(rateX, rateY);
  }
});

// [ キャンバス描画 ] -------------------------------------------------------------

/**
 * ガイド線の描画
 */
const drawOverlay = () => {
  // console.log('drawOverlay');
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    if (!elmCanvas.value) return;
    ctx = elmCanvas.value.getContext('2d');
    if (!ctx) throw new Error(`state.element.canvasOverlay.getContext('2d') Error`);
    ctx.clearRect(0, 0, state.video.size.w, state.video.size.h);
    const color = state.scan.data === null ? 'rgb(255,120,0)' : 'rgb(0,140,0)';
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

/**
 * ガイド線の描画タイミング
 */
watch(
  () => [state.scan.adjuster, state.scan.data],
  () => {
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
  console.log('qrRead');
  if (!elmVideo.value) return;
  let canv: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    canv = document.createElement('canvas');
    if (!canv) return;
    const rect = state.scan.rect;
    canv.height = rect.h;
    canv.width = rect.w;
    ctx = canv.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(elmVideo.value, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.w);
    const dataUrl = canv.toDataURL('image/jpg');
    const ret = await decodeFromImageUrl(dataUrl);
    console.log('decodeFromImageUrl', ret);
    if (ret != null) {
      state.scan.data = ret;
    } else {
      state.scan.data = null;
    }
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
 * DataUrlからQR画像を解析します
 * 解析失敗の場合Nullが返却される
 */
const decodeFromImageUrl = async (dataUrl: string) => {
  try {
    const codeReader = new BrowserQRCodeReader();
    const ret = await codeReader.decodeFromImageUrl(dataUrl);
    return ret.getText();
  } catch {
    //画像にQRがセットされていない場合エラーを検知するから「これはスルーでOK」
    return null;
  }
};

/**
 * qr解析タスクの終了
 */
const stopQrReader = () => {
  if (state.scan.intervalId !== null) {
    console.log('stopQrReader', state.scan.intervalId);
    clearInterval(state.scan.intervalId);
  }
};

//-[Style]----------------------------------------------

/**
 * Video、Canvasタグ格納用の拡大縮小する要素のStyle
 */
const styleViewRectScale = computed(() => {
  if (state.video.size.h === 0) {
    return { opacity: 0 };
  }
  return {
    transform: `scale(${scale.value})`,
    opacity: state.video.stream?.active === false ? '0' : '1',
  };
});

/**
 * スキャンしたデータを表示する要素のStyle
 */
const styleScanData = computed(() => {
  const rect = state.scan.rect;
  const scaleRate = 1 / scale.value;
  return {
    transform: `scale(${scaleRate})`,
    top: `${rect.y + rect.h}px`,
    left: `${rect.x}px`,
    width: `${rect.w / scaleRate}px`,
    opacity: !state.scan.data ? '0' : '1',
  };
});

/**
 * QR解析を一時中止しスキャンしたデータを削除、一定時間後にQR解析再開
 */
const clear = () => {
  stopQrReader();
  state.scan.data = null;
  setTimeout(() => {
    startQrReader();
  }, 1500);
};

onMounted(() => {
  getDeviceList();
});
</script>
<template>
  <div class="container-fluid">
    <div class="card mt-2 mb-3">
      <div class="card-header bg-info">カメラ</div>
      <div class="card-body">
        <div class="">デバイスリスト</div>
        <select class="form-select mb-1" v-model="state.device.id">
          <template v-for="(row, index) in state.device.list" :key="index">
            <option :value="row.deviceId">{{ row.label }}</option>
          </template>
        </select>
        <div class="view">
          <div class="view-rect" ref="elmViewContainer">
            <div class="view-rect-scale" :style="styleViewRectScale">
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
              <div class="scanData" :style="styleScanData">{{ state.scan.data }}</div>
            </div>
          </div>
          <div class="clear-btn-container" :class="{ isShow: state.scan.data !== null }">
            <button type="button" class="btn btn-warning clearBtn" @click="clear()">クリア</button>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <label class="form-label">読み取りサイズ</label>
        <input type="range" class="form-range" min="0.2" max="2" step="0.2" v-model="state.scan.adjuster" />
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

.scanData {
  position: absolute;
  height: 2em;
  overflow: hidden;
  border: solid 1px gray;
  border-radius: 10px;
  background-color: white;
  transform-origin: top left;
  padding: 2px 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 300ms;
}

.view {
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  flex-direction: column;
  .clear-btn-container {
    position: absolute;
    inset: 0 auto auto auto;
    min-width: 300px;
    max-width: 100%;
    width: 60%;
    margin-bottom: 4px;
    opacity: 0;
    transition: opacity 300ms;
    &.isShow {
      opacity: 1;
    }
    .btn {
      margin: 10px 10px 0 10px;
      width: calc(100% - 20px);
      border: solid 1px rgb(203, 88, 0);
    }
  }

  > .view-rect {
    min-width: 300px;
    max-width: 100%;
    width: 60%;
    &::before {
      content: '';
      display: block;
      padding-top: 100%;
    }
    > .view-rect-scale {
      position: absolute;
      inset: 0 0 0 0;
      transform-origin: top left;
      opacity: 0;
      canvas,
      video {
        position: absolute;
        inset: 0 0 0 0;
      }
    }
  }
}
</style>
